import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ssh2 from 'ssh2'
import { connect, execCommand, testConnection, closeClient, SshError } from '../ssh-client.js'

const { Server } = ssh2

function makeHostKey() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey
}

function makeClientKey(passphrase) {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: passphrase
      ? { type: 'pkcs1', format: 'pem', cipher: 'aes-256-cbc', passphrase }
      : { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey
}

function startServer(hostKey) {
  return new Promise((resolve, reject) => {
    const server = new Server({ hostKeys: [hostKey] }, (client) => {
      client.on('error', () => {})
      client.on('authentication', (ctx) => {
        if (ctx.username !== 'tester') return ctx.reject(['password', 'publickey'])
        if (ctx.method === 'password' && ctx.password === 'secret') return ctx.accept()
        if (ctx.method === 'publickey' && /^ssh-rsa/.test(ctx.key.algo)) return ctx.accept()
        return ctx.reject(['password', 'publickey'])
      })
      client.on('ready', () => {
        client.on('session', (accept) => {
          const session = accept()
          session.on('exec', (acceptExec, _rejectExec, info) => {
            const stream = acceptExec()
            const command = String(info?.command ?? '')
            if (command.includes('sleep 60')) {
              setTimeout(() => {
                if (!stream.destroyed) {
                  stream.exit(0)
                  stream.end()
                }
              }, 5000)
              return
            }
            if (command.includes('big')) {
              stream.write('x'.repeat(200_000))
              stream.exit(0)
              stream.end()
              return
            }
            if (command.includes('sudo -S')) {
              let input = ''
              stream.on('data', (chunk) => {
                input += chunk.toString('utf8')
              })
              stream.on('end', () => {
                if (stream.destroyed) return
                stream.write(`ran:${command}\nstdin:${input}\n`)
                stream.exit(7)
                stream.end()
              })
              return
            }
            stream.write(`ran:${command}\n`)
            stream.stderr.write('stderr-line\n')
            stream.exit(7)
            stream.end()
          })
        })
      })
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

async function waitServerClose(server) {
  await new Promise((resolve) => server.close(resolve))
}

async function runSshTests() {
  const hostKey = makeHostKey()
  const otherHostKey = makeHostKey()
  const clientKey = makeClientKey('keypass')
  const first = await startServer(hostKey)
  const second = await startServer(otherHostKey)
  let pinned = null

  const passwordProfile = {
    host: '127.0.0.1',
    port: first.port,
    username: 'tester',
    authType: 'password',
  }
  const passwordSecret = { authType: 'password', password: 'secret' }

  try {
    {
      const { client, hostKey: fingerprint } = await connect(passwordProfile, passwordSecret, { knownHostKey: null })
      assert.match(fingerprint, /^SHA256:[A-Za-z0-9+/]+$/)
      pinned = fingerprint
      const result = await execCommand(client, 'hello', { timeoutMs: 5000 })
      closeClient(client)
      assert.equal(result.exitCode, 7)
      assert.match(result.stdout, /ran:hello/)
      assert.match(result.stderr, /stderr-line/)
      assert.equal(result.stdoutTruncated, false)
      console.log('ok: password auth + exec')
    }

    {
      const result = await testConnection(passwordProfile, passwordSecret, { knownHostKey: pinned })
      assert.match(result.hostKey, /^SHA256:[A-Za-z0-9+/]+$/)
      assert.ok(result.latencyMs >= 0)
      console.log('ok: pinned host key accepted')
    }

    {
      await assert.rejects(
        () => connect(passwordProfile, { authType: 'password', password: 'wrong' }, { knownHostKey: pinned }),
        (error) => error.code === 'AUTH_FAILED',
      )
      console.log('ok: wrong password rejected')
    }

    {
      await assert.rejects(
        () => connect({ ...passwordProfile, port: second.port }, passwordSecret, { knownHostKey: pinned }),
        (error) => error.code === 'HOST_KEY_MISMATCH',
      )
      console.log('ok: host key mismatch rejected')
    }

    {
      const { client } = await connect(passwordProfile, passwordSecret, { knownHostKey: pinned })
      await assert.rejects(
        () => execCommand(client, 'sleep 60', { timeoutMs: 300 }),
        (error) => error.code === 'COMMAND_TIMEOUT',
      )
      closeClient(client)
      console.log('ok: command timeout')
    }

    {
      const { client } = await connect(passwordProfile, passwordSecret, { knownHostKey: pinned })
      const result = await execCommand(client, 'big', { timeoutMs: 5000, maxStdoutBytes: 1024 })
      closeClient(client)
      assert.equal(result.stdoutTruncated, true)
      assert.ok(result.stdout.length <= 1025)
      console.log('ok: output truncation')
    }

    {
      const keyProfile = { ...passwordProfile, authType: 'privateKey' }
      const keySecret = { authType: 'privateKey', privateKey: clientKey, passphrase: 'keypass' }
      const { client, hostKey: fingerprint } = await connect(keyProfile, keySecret, { knownHostKey: pinned })
      const result = await execCommand(client, 'key-auth', { timeoutMs: 5000 })
      closeClient(client)
      assert.match(fingerprint, /^SHA256:/)
      assert.match(result.stdout, /ran:key-auth/)
      console.log('ok: encrypted PEM private key auth')
    }
  } finally {
    await waitServerClose(first.server)
    await waitServerClose(second.server)
  }
}

async function runMigrationTests(testHome) {
  const dataDir = join(testHome, 'remote-ssh')
  await mkdir(dataDir, { recursive: true })
  const old = {
    version: 1,
    profiles: [
      {
        id: 'ssh-old001',
        name: 'Migrated host',
        host: '127.0.0.1',
        port: 2222,
        username: 'tester',
        authType: 'password',
        note: 'old note',
        hostKey: 'SHA256:oldfingerprint',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }
  await writeFile(join(dataDir, 'profiles.json'), JSON.stringify(old), 'utf8')
  const { ProfileStore } = await import('../store.js')
  const store = new ProfileStore()
  await store.ready
  const groups = store.list()
  assert.equal(groups.length, 1)
  assert.equal(groups[0].id, 'ssh-old001')
  assert.equal(groups[0].name, 'Migrated host')
  assert.equal(groups[0].note, 'old note')
  assert.equal(groups[0].hosts.length, 1)
  assert.equal(groups[0].hosts[0].id, 'ssh-old001')
  assert.equal(groups[0].hosts[0].label, '默认主机')
  assert.equal(groups[0].hosts[0].host, '127.0.0.1')
  assert.equal(groups[0].hosts[0].port, 2222)
  assert.equal(groups[0].hosts[0].hostKey, 'SHA256:oldfingerprint')
  assert.equal(groups[0].hosts[0].elevation, 'none')
  const persisted = JSON.parse(await readFile(join(dataDir, 'profiles.json'), 'utf8'))
  assert.equal(persisted.version, 2)
  assert.equal(persisted.groups[0].hosts[0].id, 'ssh-old001')
  const files = await readdir(dataDir)
  assert.ok(files.some((name) => name.includes('.v1-')))
  await writeFile(join(dataDir, 'profiles.json'), JSON.stringify({ version: 2, groups: [] }), 'utf8')
  console.log('ok: version 1 migration preserves group note, host key, and credential id')
}

function makeReq({ method, url, body }) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))])
  req.method = method
  req.url = url
  req.headers = body === undefined ? {} : { 'content-type': 'application/json' }
  return req
}

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    chunks: [],
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(value) {
      this.ended = true
      if (value !== undefined) this.chunks.push(Buffer.from(value))
    },
    json() {
      return JSON.parse(Buffer.concat(this.chunks).toString('utf8'))
    },
  }
  return res
}

async function runApiTests() {
  const { createApiHandler } = await import('../api.js')
  const now = new Date().toISOString()
  let group = {
    id: 'ssh-test01',
    name: 'Test group',
    note: '',
    createdAt: now,
    updatedAt: now,
    hosts: [],
  }
  let host = null
  const service = {
    async list() {
      return [group]
    },
    async get(id) {
      if (group.id !== id) throw new SshError('NOT_FOUND', 'missing')
      return group
    },
    async create(body) {
      group = { ...group, name: body.name, note: body.note ?? '' }
      return group
    },
    async update(id, body) {
      if (group.id !== id) throw new SshError('NOT_FOUND', 'missing')
      group = { ...group, ...body }
      return group
    },
    async remove(id) {
      if (group.id !== id) throw new SshError('NOT_FOUND', 'missing')
      return { id: group.id, name: group.name }
    },
    async addHost(id, body) {
      host = {
        id: 'host-test01',
        label: body.label,
        host: body.host,
        port: body.port,
        username: body.username,
        authType: body.authType,
        hostKey: null,
        credentialConfigured: true,
        createdAt: now,
        updatedAt: now,
      }
      group = { ...group, hosts: [host] }
      return group
    },
    async updateHost(id, hostId, body) {
      if (!host || host.id !== hostId) throw new SshError('NOT_FOUND', 'missing')
      host = { ...host, ...body }
      group = { ...group, hosts: [host] }
      return group
    },
    async removeHost(id, hostId) {
      if (!host || host.id !== hostId) throw new SshError('NOT_FOUND', 'missing')
      host = null
      group = { ...group, hosts: [] }
      return group
    },
    async testHost() {
      return { id: 'host-test01', label: 'node1', host: '127.0.0.1', port: 22, username: 'tester', success: true, latencyMs: 12 }
    },
    async testGroup() {
      return [{ id: 'host-test01', label: 'node1', success: true, latencyMs: 12 }]
    },
  }
  const handler = createApiHandler({
    service,
    connection: { requestRejection: () => undefined },
    log: { error() {} },
  })

  {
    const res = makeRes()
    await handler(makeReq({ method: 'GET', url: '/remote-ssh/api/profiles' }), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().profiles.length, 1)
    console.log('ok: api GET groups')
  }
  {
    const res = makeRes()
    await handler(makeReq({ method: 'POST', url: '/remote-ssh/api/profiles', body: { name: 'Renamed', note: 'n' } }), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().profile.name, 'Renamed')
    console.log('ok: api POST group')
  }
  {
    const res = makeRes()
    await handler(
      makeReq({
        method: 'POST',
        url: '/remote-ssh/api/profiles/ssh-test01/hosts',
        body: { label: 'node1', host: '127.0.0.1', port: 22, username: 'tester', authType: 'password', password: 'secret' },
      }),
      res,
    )
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().profile.hosts.length, 1)
    console.log('ok: api POST host')
  }
  {
    const res = makeRes()
    await handler(
      makeReq({ method: 'PUT', url: '/remote-ssh/api/profiles/ssh-test01/hosts/host-test01', body: { label: 'node1a' } }),
      res,
    )
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().profile.hosts[0].label, 'node1a')
    console.log('ok: api PUT host')
  }
  {
    const res = makeRes()
    await handler(makeReq({ method: 'POST', url: '/remote-ssh/api/profiles/ssh-test01/hosts/host-test01/test' }), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().result.success, true)
    console.log('ok: api host test')
  }
  {
    const res = makeRes()
    await handler(makeReq({ method: 'POST', url: '/remote-ssh/api/profiles/ssh-test01/test' }), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().results[0].success, true)
    console.log('ok: api group test')
  }
  {
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE', url: '/remote-ssh/api/profiles/ssh-test01/hosts/host-test01' }), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().profile.hosts.length, 0)
    console.log('ok: api DELETE host')
  }
  {
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE', url: '/remote-ssh/api/profiles/ssh-test01' }), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().removed.id, 'ssh-test01')
    console.log('ok: api DELETE group')
  }
}

async function runPluginWiringTests(credentials) {
  const { apply } = await import('../index.js')
  const tools = []
  const sections = []
  const routes = []
  const commands = []
  const injected = []
  const followedUp = []
  const fakeAgent = {
    inject(message) {
      injected.push(message)
    },
    followup(message) {
      followedUp.push(message)
    },
  }
  const ctx = {
    effect(callback) {
      return callback()
    },
    tools: {
      register(definition) {
        tools.push(definition)
        return () => {}
      },
    },
    commands: {
      register(definition) {
        commands.push(definition)
        return () => {
          const index = commands.indexOf(definition)
          if (index !== -1) commands.splice(index, 1)
        }
      },
    },
    systemPrompt: {
      section(section) {
        sections.push(section)
        return () => {}
      },
    },
    webServer: {
      register(route) {
        routes.push(route)
        return () => {}
      },
    },
    connection: { requestRejection: () => undefined },
    credentials,
  }

  apply(ctx)
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      'ssh_list',
      'ssh_exec',
      'ssh_note',
      'ssh_add_group',
      'ssh_add_host',
      'ssh_update_group',
      'ssh_update_host',
      'ssh_remove_host',
      'ssh_remove_group',
    ],
  )
  const byName = (toolName) => tools.find((tool) => tool.name === toolName)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].path, '/remote-ssh/api')
  assert.equal(routes[0].kind, 'prefix')
  assert.equal(sections.length, 1)
  assert.equal(sections[0].name, 'remote-ssh.connections')
  assert.equal(sections[0].text(), '')
  assert.equal(commands.length, 0)

  {
    const res = makeRes()
    await routes[0].handler(
      makeReq({ method: 'POST', url: '/remote-ssh/api/profiles', body: { name: 'Wiring group', note: 'group note' } }),
      res,
    )
    assert.equal(res.statusCode, 200)
    const group = res.json().profile
    assert.equal(group.name, 'Wiring group')
    assert.equal(commands.length, 1)
    assert.equal(commands[0].name, group.id)
    assert.match(commands[0].description, /Wiring group/)

    const hostRes = makeRes()
    await routes[0].handler(
      makeReq({
        method: 'POST',
        url: `/remote-ssh/api/profiles/${encodeURIComponent(group.id)}/hosts`,
        body: {
          label: 'node1',
          host: '127.0.0.1',
          port: 22,
          username: 'tester',
          authType: 'password',
          password: 'dummy-password',
        },
      }),
      hostRes,
    )
    assert.equal(hostRes.statusCode, 200)
    const withHost = hostRes.json().profile
    assert.equal(withHost.hosts.length, 1)
    assert.equal(withHost.hosts[0].credentialConfigured, true)
    assert.equal(commands.length, 1)
    assert.match(commands[0].description, /1 台主机|1 host/)

    const list = await tools[0].execute({}, {})
    assert.equal(list.connections.length, 1)
    assert.equal(list.connections[0].hosts.length, 1)
    assert.equal(list.connections[0].hosts[0].elevation, 'none')
    assert.match(tools[0].output.render({}, list)[0].text, /Wiring group/)
    assert.match(tools[0].output.render({}, list)[0].text, /node1/)

    const filtered = await tools[0].execute({ connection: group.id }, {})
    assert.match(tools[0].output.render({ connection: group.id }, filtered)[0].text, /group note/)

    const selected = await commands[0].handler({ agent: fakeAgent, rawInput: '' })
    assert.equal(selected.kind, 'success')
    assert.equal(injected.length, 1)
    assert.match(injected[0].content[0].text, /Wiring group/)
    assert.match(injected[0].content[0].text, /node1/)

    const sent = await commands[0].handler({ agent: fakeAgent, rawInput: 'echo hi' })
    assert.equal(sent.kind, 'success')
    assert.equal(followedUp.length, 1)
    assert.match(followedUp[0].content[0].text, /Task: echo hi/)

    const noted = await byName('ssh_note').execute({ connection: group.id, text: 'installed redis', action: 'append' }, {})
    assert.match(noted.note, /installed redis/)

    const adminGroupResult = await byName('ssh_add_group').execute({ name: 'Admin group', note: 'admin note' }, {})
    const adminGroup = adminGroupResult.group
    assert.equal(adminGroup.hosts.length, 0)
    assert.equal(commands.length, 2)
    const adminKeyPath = join(testHome, 'admin-key.pem')
    await writeFile(adminKeyPath, makeClientKey(null), 'utf8')
    const adminHostResult = await byName('ssh_add_host').execute(
      {
        connection: adminGroup.id,
        label: 'node9',
        host: '127.0.0.1',
        port: 22,
        username: 'tester',
        authType: 'privateKey',
        privateKeyPath: adminKeyPath,
        elevation: 'sudo-i',
      },
      {},
    )
    const adminWithHost = adminHostResult.host
    assert.equal(adminHostResult.added, true)
    assert.equal(adminWithHost.label, 'node9')
    assert.equal(adminWithHost.transport, 'ssh')
    assert.equal(adminWithHost.assetIp, '')
    assert.equal(adminWithHost.account, 'root')
    assert.equal(adminWithHost.credentialConfigured, true)
    assert.equal(JSON.stringify(adminWithHost).includes('BEGIN RSA PRIVATE KEY'), false)
    assert.equal(credentials.records.size, 2)
    assert.ok(commands.find((command) => command.name === adminGroup.id))

    const renamedGroup = await byName('ssh_update_group').execute(
      { connection: adminGroup.id, name: 'Admin group 2', note: 'admin note 2' },
      {},
    )
    assert.equal(renamedGroup.group.name, 'Admin group 2')
    assert.equal(renamedGroup.group.note, 'admin note 2')
    assert.equal(commands.length, 2)

    const updatedHost = await byName('ssh_update_host').execute(
      {
        connection: adminGroup.id,
        host: 'node9',
        label: 'node9a',
        elevation: 'sudo',
        privateKeyPath: adminKeyPath,
        resetHostKey: true,
      },
      {},
    )
    assert.equal(updatedHost.group.hosts[0].label, 'node9a')
    assert.equal(updatedHost.group.hosts[0].elevation, 'sudo')
    assert.equal(JSON.stringify(updatedHost.group).includes('BEGIN RSA PRIVATE KEY'), false)
    assert.equal(credentials.records.size, 2)

    const removedHost = await byName('ssh_remove_host').execute({ connection: adminGroup.id, host: 'node9a' }, {})
    assert.equal(removedHost.group.hosts.length, 0)
    assert.equal(credentials.records.size, 1)

    const removedGroup = await byName('ssh_remove_group').execute({ connection: adminGroup.id }, {})
    assert.equal(removedGroup.removed.id, adminGroup.id)
    assert.equal(commands.length, 1)
    assert.equal(credentials.records.size, 1)

    await assert.rejects(
      () =>
        byName('ssh_exec').execute(
          { connection: 'missing', command: 'true' },
          { signal: new AbortController().signal },
        ),
      (error) => error.code === 'NOT_FOUND',
    )

    const deleteHost = makeRes()
    await routes[0].handler(
      makeReq({ method: 'DELETE', url: `/remote-ssh/api/profiles/${encodeURIComponent(group.id)}/hosts/${encodeURIComponent(withHost.hosts[0].id)}` }),
      deleteHost,
    )
    assert.equal(deleteHost.statusCode, 200)
    assert.equal(deleteHost.json().profile.hosts.length, 0)
    assert.equal(credentials.records.size, 0)
    assert.equal(commands.length, 1)

    const deleteGroup = makeRes()
    await routes[0].handler(
      makeReq({ method: 'DELETE', url: `/remote-ssh/api/profiles/${encodeURIComponent(group.id)}` }),
      deleteGroup,
    )
    assert.equal(deleteGroup.statusCode, 200)
    assert.equal(deleteGroup.json().removed.id, group.id)
    assert.equal(commands.length, 0)
    assert.equal(credentials.records.size, 0)
  }
  console.log('ok: plugin wiring (group/host tools, prompt section, routes, slash commands)')
}

async function runServiceTests() {
  const { RemoteSshService } = await import('../service.js')
  const records = new Map()
  const credentials = {
    async modifyRecord(key, mutate) {
      const next = await mutate(records.get(key))
      if (next !== undefined) records.set(key, next)
      return next
    },
    async readRecord(key) {
      return records.get(key)
    },
    async describeRecord(key) {
      return { configured: records.has(key), kind: records.get(key)?.kind, writable: true }
    },
    async deleteRecord(key) {
      records.delete(key)
    },
  }
  const service = new RemoteSshService({ credentials })
  const first = await startServer(makeHostKey())
  const second = await startServer(makeHostKey())
  try {
    const group = await service.create({ name: 'Cluster', note: 'first note' })
    assert.equal(group.hosts.length, 0)
    const withNode1 = await service.addHost(group.id, {
      label: 'node1',
      host: '127.0.0.1',
      port: first.port,
      username: 'tester',
      authType: 'password',
      password: 'secret',
      elevation: 'sudo-i',
    })
    assert.equal(withNode1.hosts[0].credentialConfigured, true)
    assert.equal(withNode1.hosts[0].elevation, 'sudo-i')
    const withNodes = await service.addHost(group.id, {
      label: 'node2',
      host: '127.0.0.1',
      port: second.port,
      username: 'tester',
      authType: 'password',
      password: 'secret',
      elevation: 'sudo',
      elevationPassword: 'dummy-sudo-password',
    })
    assert.equal(withNodes.hosts.length, 2)

    await assert.rejects(
      () =>
        service.addHost(group.id, {
          label: 'node2',
          host: '127.0.0.1',
          port: first.port,
          username: 'tester',
          authType: 'password',
          password: 'dummy-password',
        }),
      (error) => error.code === 'DUPLICATE_NAME',
    )

    await assert.rejects(
      () => service.execute(group.id, undefined, 'hello'),
      (error) => error.code === 'HOST_REQUIRED',
    )

    const single = await service.execute(group.id, 'node1', 'hello', { timeoutMs: 5000 })
    assert.equal(single.results.length, 1)
    assert.equal(single.results[0].ok, true)
    assert.equal(single.results[0].exitCode, 7)
    assert.match(single.results[0].stdout, /ran:hello/)

    const all = await service.execute(group.id, 'all', 'hello', { timeoutMs: 5000 })
    assert.equal(all.results.length, 2)
    assert.ok(all.results.every((result) => result.ok && result.exitCode === 7))

    const rootSudoI = await service.execute(group.id, 'node1', 'hello', { root: true, timeoutMs: 5000 })
    assert.equal(rootSudoI.results[0].ok, true)
    assert.match(rootSudoI.results[0].stdout, /sudo -n -i sh -c 'hello'/)
    const rootSudo = await service.execute(group.id, 'node2', 'hello', { root: true, timeoutMs: 5000 })
    assert.equal(rootSudo.results[0].ok, true)
    assert.match(rootSudo.results[0].stdout, /sudo -S -p '' sh -c 'hello'/)
    assert.match(rootSudo.results[0].stdout, /stdin:\S+/)

    const tests = await service.testGroup(group.id)
    assert.equal(tests.length, 2)
    assert.ok(tests.every((result) => result.success === true))
    const pinned = await service.get(group.id)
    assert.ok(pinned.hosts.every((host) => typeof host.hostKey === 'string' && host.hostKey.startsWith('SHA256:')))

    const bad = await service.addHost(group.id, {
      label: 'bad',
      host: '127.0.0.1',
      port: first.port,
      username: 'tester',
      authType: 'password',
      password: 'wrong',
    })
    assert.equal(bad.hosts.length, 3)
    const mixed = await service.execute(group.id, 'all', 'hello', { timeoutMs: 5000 })
    assert.equal(mixed.results.length, 3)
    assert.equal(mixed.results.filter((result) => result.ok).length, 2)
    const badResult = mixed.results.find((result) => result.label === 'bad')
    assert.equal(badResult.ok, false)
    assert.match(badResult.error, /认证失败|登录/)
    const rootWithoutElevation = await service.execute(group.id, 'bad', 'hello', { root: true, timeoutMs: 5000 })
    assert.equal(rootWithoutElevation.results[0].ok, false)
    assert.match(rootWithoutElevation.results[0].error, /未配置提权/)

    const noted = await service.note(group.id, 'installed nginx', 'append')
    assert.match(noted.note, /first note/)
    assert.match(noted.note, /installed nginx/)
    const section = service.promptSection()
    assert.match(section, /Cluster/)
    assert.match(section, /node1/)
    assert.match(section, /installed nginx/)

    const renamed = await service.update(group.id, { name: 'Cluster 2', note: 'updated note' })
    assert.equal(renamed.name, 'Cluster 2')
    const node1 = renamed.hosts.find((host) => host.label === 'node1')
    const moved = await service.updateHost(group.id, node1.id, {
      label: 'node1a',
      host: '127.0.0.1',
      port: second.port,
      username: 'tester',
      authType: 'password',
    })
    const movedHost = moved.hosts.find((host) => host.id === node1.id)
    assert.equal(movedHost.label, 'node1a')
    assert.equal(movedHost.hostKey, null)

    const removedBad = await service.removeHost(group.id, bad.hosts.find((host) => host.label === 'bad').id)
    assert.equal(removedBad.hosts.length, 2)
    assert.equal(records.size, 2)

    await assert.rejects(
      () => service.create({ name: 'Cluster 2', note: '' }),
      (error) => error.code === 'DUPLICATE_NAME',
    )

    const removed = await service.remove(group.id)
    assert.equal(removed.id, group.id)
    assert.equal(records.size, 0)
    assert.equal((await service.list()).length, 0)

    const bastionGroup = await service.create({ name: 'Bastion fields' })
    const bastionGroupWithHost = await service.addHost(bastionGroup.id, {
      label: 'host-1',
      host: 'bastion.example.com',
      port: 12024,
      username: 'user1',
      authType: 'password',
      password: 'dummy-password',
      transport: 'sangfor',
      asset: '10',
      assetIp: '192.0.2.81',
      assetPage: '1',
      account: 'root',
      targetUsername: 'user1',
      targetPassword: 'dummy-target-password',
    })
    const bastionHost = bastionGroupWithHost.hosts[0]
    assert.equal(bastionHost.transport, 'sangfor')
    assert.equal(bastionHost.asset, '10')
    assert.equal(bastionHost.assetIp, '192.0.2.81')
    assert.equal(bastionHost.assetPage, 1)
    assert.equal(bastionHost.account, 'root')
    assert.equal(bastionHost.targetUsername, 'user1')
    assert.equal(bastionHost.targetPasswordConfigured, true)
    const bastionUpdated = await service.updateHost(bastionGroup.id, bastionHost.id, {
      account: 'user',
      targetUsername: 'ops',
    })
    assert.equal(bastionUpdated.hosts[0].account, 'user')
    assert.equal(bastionUpdated.hosts[0].targetUsername, 'ops')
    const reusedBastion = await service.addHost(bastionGroup.id, {
      label: 'host-2',
      bastionHostId: bastionHost.id,
      transport: 'sangfor',
      assetIp: '192.0.2.82',
      account: 'root',
    })
    const reusedHost = reusedBastion.hosts.find((host) => host.label === 'host-2')
    assert.equal(reusedHost.host, bastionHost.host)
    assert.equal(reusedHost.port, bastionHost.port)
    assert.equal(reusedHost.username, bastionHost.username)
    assert.equal(reusedHost.authType, bastionHost.authType)
    assert.equal(reusedHost.credentialConfigured, true)
    await service.remove(bastionGroup.id)
    assert.equal(records.size, 0)
    console.log('ok: multi-host groups, notes, tests, concurrency results, and credential cleanup')
    console.log('ok: sangfor host metadata, target credentials, and account selection')
  } finally {
    await waitServerClose(first.server)
    await waitServerClose(second.server)
  }
}

function createCredentialMock() {
  const records = new Map()
  return {
    records,
    async modifyRecord(key, mutate) {
      const next = await mutate(records.get(key))
      if (next !== undefined) records.set(key, next)
      return next
    },
    async readRecord(key) {
      return records.get(key)
    },
    async describeRecord(key) {
      return { configured: records.has(key), kind: records.get(key)?.kind, writable: true }
    },
    async deleteRecord(key) {
      records.delete(key)
    },
  }
}

const testHome = await mkdtemp(join(tmpdir(), 'dsh-remote-ssh-test-'))
process.env.DSH_HOME = testHome
try {
  await runMigrationTests(testHome)
  await runSshTests()
  await runApiTests()
  await runPluginWiringTests(createCredentialMock())
  await runServiceTests(testHome)
  console.log('all tests passed')
} finally {
  await rm(testHome, { recursive: true, force: true })
}
