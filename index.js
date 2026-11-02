import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { RemoteSshService } from './service.js'
import { createApiHandler } from './api.js'

export const name = 'remote-ssh'
export const inject = ['tools', 'webServer', 'connection', 'credentials', 'systemPrompt', 'commands']

const TEXT = (text) => [{ type: 'text', text }]

const HOST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'label',
    'host',
    'port',
    'username',
    'authType',
    'elevation',
    'transport',
    'asset',
    'assetIp',
    'assetPage',
    'account',
    'targetUsername',
    'targetPasswordConfigured',
    'credentialConfigured',
  ],
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    host: { type: 'string' },
    port: { type: 'integer' },
    username: { type: 'string' },
    authType: { type: 'string', enum: ['password', 'privateKey'] },
    elevation: { type: 'string', enum: ['none', 'sudo', 'sudo-i'] },
    transport: { type: 'string', enum: ['ssh', 'sangfor'] },
    asset: { type: 'string' },
    assetIp: { type: 'string' },
    assetPage: { type: 'integer' },
    account: { type: 'string', enum: ['root', 'user'] },
    targetUsername: { type: 'string' },
    targetPasswordConfigured: { type: 'boolean' },
    credentialConfigured: { type: 'boolean' },
  },
}

const GROUP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'note', 'updatedAt', 'hosts'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    note: { type: 'string' },
    updatedAt: { type: 'string' },
    hosts: { type: 'array', items: HOST_SCHEMA },
  },
}

const ADDED_HOST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'transport', 'assetIp', 'account', 'credentialConfigured'],
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    transport: { type: 'string', enum: ['ssh', 'sangfor'] },
    assetIp: { type: 'string' },
    account: { type: 'string', enum: ['root', 'user'] },
    credentialConfigured: { type: 'boolean' },
  },
}

function truncate(text, max) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function authLabel(authType) {
  return authType === 'password' ? 'password' : 'private key'
}

function hostLine(host) {
  const missing = host.credentialConfigured ? '' : ' [credential missing]'
  const transport =
    host.transport === 'sangfor'
      ? ` [sangfor asset ${host.assetIp || host.asset} ${host.account}${host.targetPasswordConfigured ? ' target-password set' : ''}]`
      : ''
  const elevation =
    host.transport !== 'sangfor' && host.elevation && host.elevation !== 'none'
      ? ` [root: ${host.elevation === 'sudo-i' ? 'sudo su -' : 'sudo'}]`
      : ''
  return `  - ${host.id} "${host.label}" ${host.username}@${host.host}:${host.port} (${authLabel(host.authType)})${transport}${elevation}${missing}`
}

function groupLine(group, fullNote) {
  const note = group.note ? `\n  note: ${fullNote ? group.note : truncate(group.note, 500)}` : ''
  const hosts = group.hosts.length
    ? `\n${group.hosts.map(hostLine).join('\n')}`
    : '\n  hosts: (none yet)'
  return `- ${group.id} "${group.name}" (${group.hosts.length} host${group.hosts.length === 1 ? '' : 's'})${note}${hosts}`
}

function groupForTool(group) {
  return {
    id: group.id,
    name: group.name,
    note: group.note,
    updatedAt: group.updatedAt,
    hosts: group.hosts.map((host) => ({
      id: host.id,
      label: host.label,
      host: host.host,
      port: host.port,
      username: host.username,
      authType: host.authType,
      elevation: host.elevation ?? 'none',
      transport: host.transport ?? 'ssh',
      asset: host.asset ?? '',
      assetIp: host.assetIp ?? '',
      assetPage: host.assetPage ?? 1,
      account: host.account ?? 'root',
      targetUsername: host.targetUsername ?? '',
      targetPasswordConfigured: host.targetPasswordConfigured === true,
      credentialConfigured: host.credentialConfigured,
    })),
  }
}

async function readPrivateKeyFile(path) {
  const resolved = isAbsolute(path) ? path : resolve(process.cwd(), path)
  let text
  try {
    text = await readFile(resolved, 'utf8')
  } catch (error) {
    throw new Error(`无法读取私钥文件 ${resolved}：${error?.message || String(error)}`)
  }
  if (text.length > 1_000_000) throw new Error('私钥文件过大。')
  return text
}

function findHost(group, ref) {
  const needle = String(ref ?? '').trim()
  if (!needle) throw new Error('请提供主机 id、标签或主机名。')
  if (needle.toLowerCase() === 'all') throw new Error('该操作只支持单台主机，不能使用 all。')
  const lower = needle.toLowerCase()
  const matches = group.hosts.filter(
    (host) => host.id === needle || host.label.toLowerCase() === lower || host.host.toLowerCase() === lower,
  )
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    throw new Error(`主机 "${needle}" 对应多台主机，请改用主机 id：${matches.map((host) => `${host.id} (${host.label})`).join('、')}`)
  }
  const available = group.hosts.map((host) => `${host.id} (${host.label} ${host.username}@${host.host}:${host.port})`).join('、')
  throw new Error(`连接组「${group.name}」中找不到主机 "${needle}"。${available ? `可用主机：${available}` : '该连接组还没有主机。'}`)
}

function outputBlock(label, text) {
  return `--- ${label} ---\n${text.length ? text : '(empty)'}`
}

function resultHeader(result) {
  return `=== ${result.hostId} "${result.label}" ${result.username}@${result.host}:${result.port} ===`
}

function resultBody(result) {
  if (!result.ok) {
    return `${resultHeader(result)}\nERROR: ${result.error || '执行失败'}\n${outputBlock('stdout', result.stdout)}\n${outputBlock('stderr', result.stderr)}`
  }
  const truncation = [result.stdoutTruncated ? 'stdout' : '', result.stderrTruncated ? 'stderr' : '']
    .filter(Boolean)
    .join(', ')
  return `${resultHeader(result)}\nexit ${result.exitCode}${result.signal ? ` (signal ${result.signal})` : ''} in ${result.durationMs} ms${truncation ? ` [truncated: ${truncation}]` : ''}\n${outputBlock('stdout', result.stdout)}\n${outputBlock('stderr', result.stderr)}`
}

function createUserTextMessage(text) {
  return {
    role: 'user',
    id: randomUUID(),
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }
}

function commandDescription(group) {
  const labels = group.hosts.slice(0, 3).map((host) => host.label).join(', ')
  const more = group.hosts.length > 3 ? '…' : ''
  const hosts = group.hosts.length ? ` · ${group.hosts.length} 台主机${labels ? `（${labels}${more}）` : ''}` : ' · 暂无主机'
  return `${group.name}${hosts}`
}

export function apply(ctx) {
  const service = new RemoteSshService(ctx)
  const registerTool = (definition) =>
    ctx.effect(() => ctx.tools.register(definition), `remote-ssh: tool ${definition.name}`)

  registerTool({
    name: 'ssh_list',
    description:
      'List saved SSH connection groups. A group can contain several hosts and shares one note. Credentials are never returned. Use this before a remote task when you are not sure which connection or host to use. Pass one group id or name to read that group\'s full note and host list.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        connection: {
          type: 'string',
          description: 'Optional group id or exact name whose full note and hosts should be returned.',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['connections'],
        properties: {
          connections: { type: 'array', items: GROUP_SCHEMA },
        },
      },
      render(args, value) {
        if (!value.connections.length) {
          return TEXT('No SSH connections are configured. Ask the user to add one in the Remote SSH sidebar panel.')
        }
        const full = value.connections.length === 1 && Boolean(args?.connection)
        return TEXT(
          `Saved SSH connections:\n${value.connections.map((group) => groupLine(group, full)).join('\n')}`,
        )
      },
    },
    execute: async (args) => {
      const groups = args?.connection ? [await service.get(args.connection)] : await service.list()
      return { connections: groups.map(groupForTool) }
    },
    presentCall: () => ({ card: 'generic', title: 'List SSH connections', kind: 'other' }),
  })

  registerTool({
    name: 'ssh_exec',
    description:
      'Run one non-interactive command on a saved SSH connection group. A group can contain several hosts: pass host with a host id, label, or hostname, or use host="all" to run on every host. Omitting host is allowed only for a single-host group. Set root=true to run through the host\'s configured elevation method instead of writing sudo yourself. For Sangfor bastion hosts, pass account="root" (default) or account="user" to choose the target account. Stored credentials are used automatically and never exposed. Returns one result per host with exit code, stdout, stderr, and error. After installing, configuring, or deploying something, append a note with ssh_note.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['connection', 'command'],
      properties: {
        connection: {
          type: 'string',
          description: 'Connection group id (recommended) or exact name from ssh_list.',
        },
        host: {
          type: 'string',
          description:
            'Target host id, label, or hostname inside the group. Use "all" to run on every host. Omit only when the group has exactly one host.',
        },
        command: {
          type: 'string',
          description: 'Non-interactive shell command to run on the target host or hosts.',
        },
        root: {
          type: 'boolean',
          description:
            'Run as root using the host\'s configured elevation method (sudo or sudo su -). Defaults to false; the model does not need to write the elevation command itself. Applies to standard SSH hosts only.',
        },
        account: {
          type: 'string',
          enum: ['root', 'user'],
          description:
            'Sangfor bastion target account: root (default) or user ($user). Ignored for standard SSH hosts.',
        },
        timeoutMs: {
          type: 'integer',
          description: 'Optional per-host command timeout in milliseconds (default 60000, maximum 600000).',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['connection', 'name', 'results'],
        properties: {
          connection: { type: 'string' },
          name: { type: 'string' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'hostId',
                'label',
                'host',
                'port',
                'username',
                'ok',
                'exitCode',
                'signal',
                'stdout',
                'stderr',
                'stdoutTruncated',
                'stderrTruncated',
                'durationMs',
                'error',
              ],
              properties: {
                hostId: { type: 'string' },
                label: { type: 'string' },
                host: { type: 'string' },
                port: { type: 'integer' },
                username: { type: 'string' },
                ok: { type: 'boolean' },
                exitCode: { type: 'integer' },
                signal: { type: 'string' },
                stdout: { type: 'string' },
                stderr: { type: 'string' },
                stdoutTruncated: { type: 'boolean' },
                stderrTruncated: { type: 'boolean' },
                durationMs: { type: 'integer' },
                error: { type: 'string' },
              },
            },
          },
        },
      },
      render(_args, value) {
        const mode = [
          _args?.account ? ` [account: ${_args.account}]` : '',
          _args?.root ? ' [root]' : '',
        ].join('')
        return TEXT(
          `[${value.connection}] ${value.name} — ${value.results.length} host${value.results.length === 1 ? '' : 's'}${mode}\n${value.results.map(resultBody).join('\n\n')}`,
        )
      },
    },
    execute: async (args, exec) => {
      return service.execute(args.connection, args.host, args.command, {
        timeoutMs: args.timeoutMs,
        signal: exec.signal,
        root: args.root === true,
        account: args.account,
      })
    },
    presentCall: (args) => ({
      card: 'terminal',
      title: 'SSH command',
      description: truncate(String(args?.command ?? ''), 240),
    }),
  })

  registerTool({
    name: 'ssh_note',
    description:
      'Record durable state in a saved SSH connection group\'s shared note so later sessions know what was installed or changed across the group\'s hosts. action="append" adds a timestamped line; action="replace" rewrites the whole note. Never put passwords, private keys, tokens, or other secrets in a note.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['connection', 'text'],
      properties: {
        connection: {
          type: 'string',
          description: 'Connection group id (recommended) or exact name from ssh_list.',
        },
        text: {
          type: 'string',
          description:
            'Note text. For append, one concise sentence about what changed and on which host (for example: node1 installed nginx under /etc/nginx and enabled the service).',
        },
        action: {
          type: 'string',
          enum: ['append', 'replace'],
          description: 'append (default) adds a timestamped line; replace rewrites the note.',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['connection', 'name', 'action', 'note', 'updatedAt'],
        properties: {
          connection: { type: 'string' },
          name: { type: 'string' },
          action: { type: 'string' },
          note: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
      render(_args, value) {
        return TEXT(
          `Note saved for ${value.connection} "${value.name}" (${value.note.length} chars, action ${value.action}).`,
        )
      },
    },
    execute: async (args) => {
      return service.note(args.connection, args.text, args.action || 'append')
    },
    presentCall: () => ({ card: 'generic', title: 'Update SSH note', kind: 'other' }),
  })

  registerTool({
    name: 'ssh_add_group',
    description:
      'Create a saved SSH connection group. A group holds one shared note and may contain several hosts. Use ssh_add_host to add hosts; credentials are stored outside the conversation.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'Group name, unique among saved groups.' },
        note: { type: 'string', description: 'Optional shared note describing what the group is for.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['group'],
        properties: { group: GROUP_SCHEMA },
      },
      render(_args, value) {
        return TEXT(`Created connection group ${value.group.id} "${value.group.name}".`)
      },
    },
    execute: async (args) => ({
      group: groupForTool(await service.create({ name: args.name, note: args.note ?? '' })),
    }),
    presentCall: () => ({ card: 'generic', title: 'Add SSH group', kind: 'other' }),
  })

  registerTool({
    name: 'ssh_add_host',
    description:
      'Add a host to a saved SSH connection group. Credentials are stored in the credential service and never returned. Prefer privateKeyPath: the host process reads that local file and stores the key, so its contents never enter the conversation. Use privateKey only when the caller already has the key text. For a Sangfor bastion, pass transport="sangfor" and bastionHostId of an existing Sangfor host together with the assetIp: host/port/username/authType are filled from the saved bastion and its login credentials are copied, so only connection, label, assetIp, and bastionHostId are needed. The result only says whether the host was added; it never returns the bastion asset list.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['connection', 'label'],
      properties: {
        connection: { type: 'string', description: 'Connection group id or exact name.' },
        label: { type: 'string', description: 'Host label, unique inside the group (for example node1).' },
        host: { type: 'string', description: 'Hostname or IP address.' },
        port: { type: 'integer', description: 'SSH port (default 22).' },
        username: { type: 'string', description: 'Login user.' },
        authType: { type: 'string', enum: ['password', 'privateKey'], description: 'Authentication method.' },
        password: { type: 'string', description: 'Password when authType=password; stored outside the conversation.' },
        privateKeyPath: {
          type: 'string',
          description: 'Absolute path to a local OpenSSH/PEM private key file. Preferred over privateKey.',
        },
        privateKey: { type: 'string', description: 'Private key text when a path is not available.' },
        passphrase: { type: 'string', description: 'Private key passphrase when the key is encrypted.' },
        elevation: {
          type: 'string',
          enum: ['none', 'sudo', 'sudo-i'],
          description: 'How root=true is applied: none, sudo, or sudo-i (sudo su -).',
        },
        elevationPassword: { type: 'string', description: 'Password for sudo when it is not passwordless.' },
        transport: {
          type: 'string',
          enum: ['ssh', 'sangfor'],
          description: 'Connection transport: ssh (default) or sangfor (Sangfor bastion menu).',
        },
        asset: { type: 'string', description: 'Legacy Sangfor menu asset number; prefer assetIp for new hosts.' },
        assetIp: { type: 'string', description: 'Sangfor asset IP, for example "192.0.2.81".' },
        assetPage: { type: 'integer', description: 'Legacy Sangfor menu page number (default 1).' },
        account: {
          type: 'string',
          enum: ['root', 'user'],
          description: 'Default Sangfor target account: root (default) or user ($user).',
        },
        targetUsername: { type: 'string', description: 'Target username when account=user.' },
        targetPassword: { type: 'string', description: 'Target password when the bastion asks for one.' },
        bastionHostId: {
          type: 'string',
          description:
            'Existing Sangfor host id whose bastion login credentials should be reused for this new host. The new host copies the saved bastion password/key, so it does not need to be entered again.',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['added', 'host'],
        properties: {
          added: { type: 'boolean' },
          host: ADDED_HOST_SCHEMA,
        },
      },
      render(_args, value) {
        const target = value.host.assetIp || value.host.label
        return TEXT(`Host added: ${value.host.label} (${target}).`)
      },
    },
    execute: async (args) => {
      let privateKey = args.privateKey
      if (args.privateKeyPath) privateKey = await readPrivateKeyFile(args.privateKeyPath)
      const group = await service.addHost(args.connection, {
        label: args.label,
        host: args.host,
        port: args.port ?? 22,
        username: args.username,
        authType: args.authType,
        password: args.password,
        privateKey,
        passphrase: args.passphrase,
        elevation: args.elevation,
        elevationPassword: args.elevationPassword,
        transport: args.transport,
        asset: args.asset,
        assetIp: args.assetIp,
        assetPage: args.assetPage,
        account: args.account,
        targetUsername: args.targetUsername,
        targetPassword: args.targetPassword,
        bastionHostId: args.bastionHostId,
      })
      const added = group.hosts.find((host) => host.label === args.label)
      if (!added) throw new Error(`主机「${args.label}」添加后未能找到。`)
      return {
        added: true,
        host: {
          id: added.id,
          label: added.label,
          transport: added.transport ?? 'ssh',
          assetIp: added.assetIp ?? '',
          account: added.account ?? 'root',
          credentialConfigured: added.credentialConfigured === true,
        },
      }
    },
    presentCall: () => ({ card: 'generic', title: 'Add SSH host', kind: 'other' }),
  })

  registerTool({
    name: 'ssh_update_group',
    description:
      'Rename a saved SSH connection group or replace its shared note. Use ssh_note for append-only notes and this tool for explicit renames or corrections.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['connection'],
      properties: {
        connection: { type: 'string', description: 'Connection group id or exact name.' },
        name: { type: 'string', description: 'New group name.' },
        note: { type: 'string', description: 'Replacement shared note (full text).' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['group'],
        properties: { group: GROUP_SCHEMA },
      },
      render(_args, value) {
        return TEXT(`Updated ${value.group.id} "${value.group.name}".`)
      },
    },
    execute: async (args) => {
      if (args.name === undefined && args.note === undefined) {
        throw new Error('至少提供 name 或 note。')
      }
      const current = await service.get(args.connection)
      const group = await service.update(current.id, { name: args.name, note: args.note })
      return { group: groupForTool(group) }
    },
    presentCall: () => ({ card: 'generic', title: 'Update SSH group', kind: 'other' }),
  })

  registerTool({
    name: 'ssh_update_host',
    description:
      'Update any saved host field: label, address, port, username, authentication type, password/private key, elevation method, elevation password, transport, Sangfor asset/account/target credentials, or target password. Also resets the pinned host key with resetHostKey=true. Prefer privateKeyPath when rotating a key so its contents never enter the conversation.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['connection', 'host'],
      properties: {
        connection: { type: 'string', description: 'Connection group id or exact name.' },
        host: { type: 'string', description: 'Target host id, label, or hostname inside the group.' },
        label: { type: 'string', description: 'New host label.' },
        hostname: { type: 'string', description: 'New host address (IP or hostname).' },
        port: { type: 'integer', description: 'New SSH port.' },
        username: { type: 'string', description: 'New login user.' },
        authType: { type: 'string', enum: ['password', 'privateKey'], description: 'New authentication method.' },
        password: { type: 'string', description: 'New password when authType=password.' },
        privateKeyPath: {
          type: 'string',
          description: 'Absolute path to a local OpenSSH/PEM private key file for key rotation. Preferred over privateKey.',
        },
        privateKey: { type: 'string', description: 'Private key text when a path is not available.' },
        passphrase: { type: 'string', description: 'Private key passphrase when needed.' },
        elevation: {
          type: 'string',
          enum: ['none', 'sudo', 'sudo-i'],
          description: 'How root=true is applied: none, sudo, or sudo-i (sudo su -).',
        },
        elevationPassword: { type: 'string', description: 'Password for sudo; an empty string clears it.' },
        transport: {
          type: 'string',
          enum: ['ssh', 'sangfor'],
          description: 'Connection transport: ssh or sangfor.',
        },
        asset: { type: 'string', description: 'Legacy Sangfor menu asset number; prefer assetIp.' },
        assetIp: { type: 'string', description: 'Sangfor asset IP, for example "192.0.2.81".' },
        assetPage: { type: 'integer', description: 'Legacy Sangfor menu page number.' },
        account: {
          type: 'string',
          enum: ['root', 'user'],
          description: 'Default Sangfor target account: root or user ($user).',
        },
        targetUsername: { type: 'string', description: 'Target username when account=user.' },
        targetPassword: { type: 'string', description: 'Target password when the bastion asks for one.' },
        resetHostKey: { type: 'boolean', description: 'Forget the pinned host key so the next connection records it again.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['group'],
        properties: { group: GROUP_SCHEMA },
      },
      render(_args, value) {
        return TEXT(`Host updated in ${value.group.id} "${value.group.name}".`)
      },
    },
    execute: async (args) => {
      const patch = {}
      for (const key of [
        'label',
        'port',
        'username',
        'authType',
        'password',
        'passphrase',
        'elevation',
        'transport',
        'asset',
        'assetIp',
        'assetPage',
        'account',
        'targetUsername',
      ]) {
        if (args[key] !== undefined) patch[key] = args[key]
      }
      if (args.hostname !== undefined) patch.host = args.hostname
      if (args.elevationPassword !== undefined) patch.elevationPassword = args.elevationPassword
      if (args.targetPassword !== undefined) patch.targetPassword = args.targetPassword
      if (args.resetHostKey === true) patch.resetHostKey = true
      if (args.privateKeyPath) patch.privateKey = await readPrivateKeyFile(args.privateKeyPath)
      else if (args.privateKey !== undefined) patch.privateKey = args.privateKey
      if (Object.keys(patch).length === 0) throw new Error('至少提供一个要修改的字段。')
      const current = await service.get(args.connection)
      const target = findHost(current, args.host)
      const group = await service.updateHost(current.id, target.id, patch)
      return { group: groupForTool(group) }
    },
    presentCall: () => ({ card: 'generic', title: 'Update SSH host', kind: 'other' }),
  })

  registerTool({
    name: 'ssh_remove_host',
    description:
      'Remove one host from a saved SSH connection group and delete its stored credential. This is destructive; the group and its shared note remain.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['connection', 'host'],
      properties: {
        connection: { type: 'string', description: 'Connection group id or exact name.' },
        host: { type: 'string', description: 'Host id, label, or hostname inside the group.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['group'],
        properties: { group: GROUP_SCHEMA },
      },
      render(_args, value) {
        return TEXT(`Host removed from ${value.group.id} "${value.group.name}" (${value.group.hosts.length} remaining).`)
      },
    },
    execute: async (args) => {
      const current = await service.get(args.connection)
      const target = findHost(current, args.host)
      const group = await service.removeHost(current.id, target.id)
      return { group: groupForTool(group) }
    },
    presentCall: () => ({ card: 'generic', title: 'Remove SSH host', kind: 'other' }),
  })

  registerTool({
    name: 'ssh_remove_group',
    description:
      'Remove a saved SSH connection group, all of its hosts, and every stored credential. This is destructive and cannot be undone.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['connection'],
      properties: {
        connection: { type: 'string', description: 'Connection group id or exact name.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['removed'],
        properties: {
          removed: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      render(_args, value) {
        return TEXT(`Removed connection group ${value.removed.id} "${value.removed.name}".`)
      },
    },
    execute: async (args) => {
      const current = await service.get(args.connection)
      return { removed: await service.remove(current.id) }
    },
    presentCall: () => ({ card: 'generic', title: 'Remove SSH group', kind: 'other' }),
  })

  const commandDisposers = new Map()
  const disposeCommands = () => {
    for (const dispose of commandDisposers.values()) {
      try {
        dispose()
      } catch (error) {
        console.error('[remote-ssh] failed to dispose slash command', error)
      }
    }
    commandDisposers.clear()
  }

  const syncCommands = () => {
    disposeCommands()
    for (const group of service.snapshot()) {
      try {
        const dispose = ctx.commands.register({
          name: group.id,
          description: commandDescription(group),
          input: { hint: '[task]' },
          handler: async (invocation) => {
            let current
            try {
              current = await service.get(group.id)
            } catch (error) {
              return { kind: 'error', text: error?.message || '该连接组已不存在。' }
            }
            if (current.hosts.length === 0) {
              return {
                kind: 'error',
                text: `连接组「${current.name}」还没有主机，请先在远程管理页面添加主机。`,
              }
            }
            const note = current.note ? `\nNote: ${truncate(current.note, 1500)}` : ''
            const hosts = current.hosts
              .slice(0, 20)
              .map(
                (host) =>
                  `- ${host.id} "${host.label}" ${host.username}@${host.host}:${host.port} (${authLabel(host.authType)})${host.credentialConfigured ? '' : ' [credential missing]'}`,
              )
              .join('\n')
            const more = current.hosts.length > 20 ? `\n- … +${current.hosts.length - 20} more hosts` : ''
            const summary = `[SSH connection selected: ${current.id} "${current.name}" — ${current.hosts.length} host${current.hosts.length === 1 ? '' : 's'}]\nHosts:\n${hosts}${more}${note}`
            const task = String(invocation.rawInput ?? '').trim()
            if (task.length > 0) {
              invocation.agent.followup(createUserTextMessage(`${summary}\n\nTask: ${task}`))
              return {
                kind: 'success',
                text: `已发送给模型：在「${current.name}」上执行：${task}。多主机连接组请在任务中说明目标主机或“全部”。`,
              }
            }
            invocation.agent.inject(createUserTextMessage(summary))
            return {
              kind: 'success',
              text: `已选择「${current.name}」（${current.hosts.length} 台主机）。直接输入任务即可，模型已经拿到主机列表。`,
            }
          },
        })
        if (typeof dispose === 'function') commandDisposers.set(group.id, dispose)
      } catch (error) {
        console.error(`[remote-ssh] failed to register slash command for ${group.id}`, error)
      }
    }
  }

  ctx.effect(() => {
    let disposed = false
    const off = service.onChange(syncCommands)
    service.ready.then(() => {
      if (!disposed) syncCommands()
    })
    syncCommands()
    return () => {
      disposed = true
      off()
      disposeCommands()
    }
  }, 'remote-ssh: slash commands')

  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: 'remote-ssh.connections',
        order: 52,
        text: () => service.promptSection(),
      }),
    'remote-ssh: prompt section',
  )

  const handler = createApiHandler({ service, connection: ctx.connection, log: console })
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: '/remote-ssh/api',
        handler,
      }),
    'remote-ssh: browser API',
  )
}
