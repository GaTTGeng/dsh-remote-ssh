import { randomUUID } from 'node:crypto'
import { connect, closeClient, SshError } from './ssh-client.js'

const DEFAULT_TIMEOUT_MS = 60_000
const LOGIN_TIMEOUT_MS = 30_000
const MAX_STDOUT_BYTES = 65_536

const ANSI_PATTERN = [
  /\x1b\[[0-?]*[ -/]*[@-~]/g,
  /\x1b\][^\x07]*(?:\x07|\x1b\\)/g,
  /\x1b[@-_]/g,
]

function stripAnsi(value) {
  let text = value
  for (const pattern of ANSI_PATTERN) text = text.replace(pattern, '')
  return text.replace(/\r/g, '')
}

function redact(value, secrets) {
  let text = value
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 0) text = text.split(secret).join('[REDACTED]')
  }
  return text
}

function clampTimeout(value) {
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS
  return Math.min(600_000, Math.max(10_000, Math.trunc(value)))
}

function normalizeAccount(value) {
  if (value === undefined || value === null || value === '') return 'root'
  const account = String(value).trim().toLowerCase()
  if (account === 'root') return 'root'
  if (account === 'user' || account === '$user') return 'user'
  throw new SshError('VALIDATION', '堡垒机账号必须是 root 或 user。')
}

/**
 * A tiny expect-style wrapper around an ssh2 shell channel. The bastion menu is
 * a terminal UI, so matching must happen on ANSI-stripped output.
 */
class PtySession {
  constructor(stream, secrets = []) {
    this.stream = stream
    this.secrets = secrets
    this.raw = ''
    this.cleaned = ''
    this.waiters = new Set()
    this.closed = false
    this.closeError = null
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => this.append(chunk))
    if (stream.stderr) {
      stream.stderr.setEncoding('utf8')
      stream.stderr.on('data', (chunk) => this.append(chunk))
    }
    stream.on('close', () => this.fail(new SshError('SANGFOR_CLOSED', '堡垒机会话已关闭。')))
    stream.on('error', (error) => this.fail(new SshError('SANGFOR_STREAM', `堡垒机会话错误：${error.message}`)))
  }

  append(chunk) {
    this.raw += chunk
    this.cleaned = stripAnsi(this.raw)
    for (const waiter of [...this.waiters]) this.check(waiter)
  }

  check(waiter) {
    for (const item of waiter.items) {
      const match = item.pattern.exec(this.cleaned)
      if (!match) continue
      this.settle(waiter)
      waiter.resolve({ name: item.name, match, index: match.index, text: this.cleaned })
      return
    }
  }

  settle(waiter) {
    if (waiter.timer) clearTimeout(waiter.timer)
    this.waiters.delete(waiter)
  }

  waitFor(items, timeoutMs, label) {
    if (this.closeError) return Promise.reject(this.closeError)
    if (this.closed) return Promise.reject(new SshError('SANGFOR_CLOSED', '堡垒机会话已关闭。'))
    for (const item of items) {
      const match = item.pattern.exec(this.cleaned)
      if (match) return Promise.resolve({ name: item.name, match, index: match.index, text: this.cleaned })
    }
    return new Promise((resolve, reject) => {
      const waiter = { items, resolve, reject, timer: null }
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter)
        reject(
          new SshError(
            'SANGFOR_TIMEOUT',
            `堡垒机等待「${label}」超时（${timeoutMs} ms）。`,
          ),
        )
      }, timeoutMs)
      this.waiters.add(waiter)
    })
  }

  fail(error) {
    if (this.closeError) return
    this.closeError = error
    this.closed = true
    for (const waiter of [...this.waiters]) {
      this.settle(waiter)
      waiter.reject(error)
    }
  }

  send(text) {
    if (this.closed) throw new SshError('SANGFOR_CLOSED', '堡垒机会话已关闭。')
    this.stream.write(text)
  }

  clear() {
    this.raw = ''
    this.cleaned = ''
  }

  close() {
    this.closed = true
    try {
      this.stream.end()
    } catch {}
  }
}

function shellPrompt() {
  return { name: 'shell', pattern: /(?:^|\n)[^\n]*[#$]\s*$/m }
}

const ASSET_ROW_PATTERN =
  /^\|\s*(\d+)\s*\|\s*([^|]*?)\s*\|\s*((?:\d{1,3}\.){3}\d{1,3})\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|$/gm

/** Parse the asset table from the bastion's search result screen. */
export function parseAssetTable(text) {
  const results = []
  ASSET_ROW_PATTERN.lastIndex = 0
  let match
  while ((match = ASSET_ROW_PATTERN.exec(text))) {
    const number = Number(match[1])
    if (!Number.isInteger(number) || number < 1) continue
    results.push({
      number,
      name: match[2].trim(),
      ip: match[3].trim(),
      type: match[4].trim(),
      protocols: match[5].trim(),
    })
  }
  return results
}

function withPatterns(extra) {
  return [
    { name: 'password', pattern: /password:\s*$/im },
    { name: 'username', pattern: /Username:\s*$/im },
    shellPrompt(),
    { name: 'error', pattern: /(Permission denied|Login incorrect|Authentication failed|Connection refused|Connection closed)/i },
    ...extra,
  ]
}

function cleanCommandOutput(raw, command, token) {
  const text = stripAnsi(raw)
  const commandText = command.trim()
  const lines = text.split('\n')
  const output = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.includes(token)) continue
    if (commandText && trimmed.includes(commandText)) continue
    if (/^[^\n]*[#$]\s*$/.test(trimmed)) continue
    if (/^(Selecting server|Selecting Account|Selecting protocol|Select username|Password)\b/i.test(trimmed)) continue
    output.push(line.replace(/\s+$/, ''))
  }
  return output.join('\n').trim()
}

/**
 * Search assets in the bastion menu by a fuzzy keyword (usually an IP) and
 * return the parsed result rows. Used by the host form autocomplete and by
 * ssh_search_assets for the model.
 */
export async function searchSangforAssets(host, secret, query, options = {}) {
  if (host.transport !== 'sangfor') throw new SshError('VALIDATION', '该主机未配置为深信服堡垒机连接。')
  const keyword = String(query ?? '')
    .trim()
    .replace(/[\r\n]+/g, ' ')
  if (!keyword) throw new SshError('VALIDATION', '搜索关键字不能为空。')
  if (keyword.length > 200) throw new SshError('VALIDATION', '搜索关键字过长。')
  const timeoutMs = clampTimeout(options.timeoutMs ?? LOGIN_TIMEOUT_MS)
  const secrets = [secret.password, secret.privateKey, secret.targetPassword].filter(
    (value) => typeof value === 'string' && value.length > 0,
  )
  let client
  let pty
  try {
    const connection = await connect(host, secret, {
      knownHostKey: options.knownHostKey,
      connectTimeoutMs: 20_000,
    })
    client = connection.client
    const stream = await new Promise((resolve, reject) => {
      client.shell({ term: 'xterm-256color', cols: 160, rows: 48 }, (error, shell) => {
        if (error) reject(new SshError('SANGFOR_SHELL', `无法打开堡垒机会话：${error.message}`))
        else resolve(shell)
      })
    })
    pty = new PtySession(stream, secrets)
    await pty.waitFor([{ name: 'menu', pattern: /Selecting server:\s*$/im }], timeoutMs, '资产菜单')
    pty.clear()
    pty.send(`g ${keyword}\r`)
    await pty.waitFor([{ name: 'results', pattern: /Selecting server:\s*$/im }], timeoutMs, '资产搜索结果')
    return { hostKey: connection.hostKey, results: parseAssetTable(pty.cleaned) }
  } catch (error) {
    if (error instanceof SshError) throw error
    throw new SshError('SANGFOR_SEARCH_FAILED', `堡垒机资产搜索失败：${redact(String(error?.message || error), secrets)}`)
  } finally {
    pty?.close()
    if (client) closeClient(client)
  }
}

/**
 * Run one command through the Sangfor bastion's interactive resource menu.
 *
 * The bastion does not implement ssh2 exec or direct-tcpip, so a PTY shell is
 * opened and the menu is driven with expect-style prompts. The target side is
 * assumed to be a POSIX shell (the SSH2 protocol option in the menu).
 */
export async function runSangforCommand(host, secret, command, options = {}) {
  if (host.transport !== 'sangfor') throw new SshError('VALIDATION', '该主机未配置为深信服堡垒机连接。')
  const assetIp = String(host.assetIp ?? '').trim()
  const asset = String(host.asset ?? '').trim()
  if (!assetIp && !/^\d+$/.test(asset)) {
    throw new SshError('VALIDATION', '堡垒机资产 IP 不能为空。')
  }
  if (assetIp && /\s/.test(assetIp)) throw new SshError('VALIDATION', '堡垒机资产 IP 不能包含空白字符。')
  const assetPage = Number(host.assetPage ?? 1)
  if (!Number.isInteger(assetPage) || assetPage < 1) throw new SshError('VALIDATION', '堡垒机资产页码必须是正整数。')
  const account = normalizeAccount(options.account ?? host.account ?? 'root')
  const targetUsername = String(options.targetUsername ?? host.targetUsername ?? '').trim()
  const targetPassword = String(options.targetPassword ?? secret.targetPassword ?? '')
  const timeoutMs = clampTimeout(options.timeoutMs)
  const startedAt = Date.now()
  const secrets = [secret.password, secret.privateKey, targetPassword].filter(
    (value) => typeof value === 'string' && value.length > 0,
  )

  if (options.signal?.aborted) throw new SshError('CANCELLED', '远程命令已取消。')

  let client
  let pty
  let hostKey = null
  let onAbort = null
  try {
    const connection = await connect(host, secret, {
      knownHostKey: options.knownHostKey,
      connectTimeoutMs: 20_000,
    })
    client = connection.client
    hostKey = connection.hostKey
    if (options.signal?.aborted) throw new SshError('CANCELLED', '远程命令已取消。')

    const stream = await new Promise((resolve, reject) => {
      client.shell({ term: 'xterm-256color', cols: 160, rows: 48 }, (error, shell) => {
        if (error) reject(new SshError('SANGFOR_SHELL', `无法打开堡垒机会话：${error.message}`))
        else resolve(shell)
      })
    })
    pty = new PtySession(stream, secrets)

    onAbort = () => {
      pty?.close()
      closeClient(client)
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })

    await pty.waitFor([{ name: 'menu', pattern: /Selecting server:\s*$/im }], LOGIN_TIMEOUT_MS, '资产菜单')
    pty.clear()
    if (assetIp) {
      pty.send(`g ${assetIp}\r`)
      await pty.waitFor(
        [{ name: 'filtered', pattern: /Selecting server:\s*$/im }],
        LOGIN_TIMEOUT_MS,
        '资产搜索结果',
      )
      const results = parseAssetTable(pty.cleaned)
      if (results.length === 0) {
        throw new SshError('SANGFOR_ASSET_NOT_FOUND', `堡垒机中找不到资产 IP「${assetIp}」。`)
      }
      const chosen = results.find((result) => result.ip === assetIp) || results[0]
      pty.clear()
      pty.send(`${chosen.number}\r`)
    } else {
      for (let page = 1; page < assetPage; page += 1) {
        pty.send('n\r')
        await pty.waitFor([{ name: 'menu', pattern: /Selecting server:\s*$/im }], LOGIN_TIMEOUT_MS, '资产菜单翻页')
        pty.clear()
      }
      pty.send(`${asset}\r`)
    }
    await pty.waitFor(
      [
        { name: 'account', pattern: /Selecting Account:\s*$/im },
        { name: 'invalid', pattern: /输入的命令有误|Selecting server:\s*$/im },
      ],
      LOGIN_TIMEOUT_MS,
      '账号菜单',
    )
    pty.clear()

    pty.send(account === 'user' ? '1\r' : '2\r')
    await pty.waitFor(
      [
        { name: 'protocol', pattern: /Selecting protocol:\s*$/im },
        { name: 'invalid', pattern: /输入的命令有误|Selecting Account:\s*$/im },
      ],
      LOGIN_TIMEOUT_MS,
      '协议菜单',
    )
    pty.clear()

    pty.send('1\r')
    let loggedIn = false
    let passwordAttempts = 0
    for (let attempt = 0; attempt < 4 && !loggedIn; attempt += 1) {
      const result = await pty.waitFor(withPatterns([]), LOGIN_TIMEOUT_MS, '目标机登录')
      if (result.name === 'shell') {
        loggedIn = true
        break
      }
      if (result.name === 'error') {
        throw new SshError('SANGFOR_TARGET_AUTH', `目标机登录失败：${result.match[0]}。`)
      }
      if (result.name === 'username') {
        if (!targetUsername) {
          throw new SshError('SANGFOR_USERNAME_MISSING', '堡垒机要求输入目标用户名，但主机未配置 targetUsername。')
        }
        pty.send(`${targetUsername}\r`)
        pty.clear()
        continue
      }
      if (result.name === 'password') {
        passwordAttempts += 1
        if (passwordAttempts > 1) {
          throw new SshError('SANGFOR_TARGET_AUTH', '目标机密码被拒绝；为避免锁定账号，已停止重试。')
        }
        if (!targetPassword) {
          throw new SshError('SANGFOR_PASSWORD_MISSING', '堡垒机要求输入目标密码，但主机未配置 targetPassword。')
        }
        pty.send(`${targetPassword}\r`)
        pty.clear()
        continue
      }
    }
    if (!loggedIn) throw new SshError('SANGFOR_LOGIN_FAILED', '未能进入目标机 shell。')

    pty.clear()
    const token = `DSH${randomUUID().replace(/-/g, '').slice(0, 10)}`
    const begin = `${token}_BEGIN`
    const exit = `${token}_EXIT`
    pty.send(`printf '${begin}\\n'\r`)
    await pty.waitFor([{ name: 'begin', pattern: new RegExp(begin) }], 5_000, '起始标记').catch(() => {})
    pty.send(`${command}\r`)
    pty.send(`printf '${exit}:%s\\n' "$?"\r`)
    const exitResult = await pty.waitFor(
      [
        { name: 'exit', pattern: new RegExp(`${exit}:(\\d+)`) },
        { name: 'error', pattern: /(Permission denied|command not found|Connection closed)/i },
      ],
      timeoutMs,
      '命令结束标记',
    )
    if (exitResult.name === 'error') {
      throw new SshError('SANGFOR_COMMAND_FAILED', `目标机命令执行失败：${exitResult.match[0]}`)
    }

    const exitIndex = exitResult.index
    const cleaned = stripAnsi(pty.raw)
    const beginIndex = cleaned.lastIndexOf(begin)
    const captured = beginIndex >= 0 ? cleaned.slice(beginIndex + begin.length, exitIndex) : ''
    const exitCode = Number(exitResult.match[1])
    let stdout = cleanCommandOutput(captured, command, token)
    let stdoutTruncated = false
    if (Buffer.byteLength(stdout, 'utf8') > MAX_STDOUT_BYTES) {
      stdout = Buffer.from(stdout, 'utf8').subarray(0, MAX_STDOUT_BYTES).toString('utf8')
      stdoutTruncated = true
    }

    return {
      hostKey,
      exitCode: Number.isInteger(exitCode) ? exitCode : -1,
      signal: '',
      stdout,
      stderr: '',
      stdoutTruncated,
      stderrTruncated: false,
      durationMs: Date.now() - startedAt,
    }
  } catch (error) {
    if (error instanceof SshError) throw error
    throw new SshError('SANGFOR_FAILED', `堡垒机命令失败：${redact(String(error?.message || error), secrets)}`)
  } finally {
    if (onAbort) options.signal?.removeEventListener('abort', onAbort)
    pty?.close()
    if (client) closeClient(client)
  }
}
