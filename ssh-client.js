import ssh2 from 'ssh2'

const { Client } = ssh2

const DEFAULT_CONNECT_TIMEOUT_MS = 20_000
const DEFAULT_COMMAND_TIMEOUT_MS = 60_000
const MAX_COMMAND_TIMEOUT_MS = 600_000
const MAX_STDOUT_BYTES = 65_536
const MAX_STDERR_BYTES = 32_768
const ERROR_OUTPUT_TAIL = 2_000

export class SshError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'SshError'
    this.code = code
    this.details = details
  }
}

function clamp(value, minimum, maximum) {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)))
}

function targetOf(profile) {
  return `${profile.username}@${profile.host}:${profile.port}`
}

function openSshFingerprint(hashedKey) {
  return `SHA256:${Buffer.from(hashedKey, 'hex').toString('base64').replace(/=+$/, '')}`
}

function authLabel(profile) {
  return profile.authType === 'password' ? '密码' : '私钥'
}

function connectionError(profile, error) {
  const target = targetOf(profile)
  const code = error?.code
  const message = error?.message || String(error)
  if (code === 'ECONNREFUSED') {
    return new SshError('CONNECTION_REFUSED', `无法连接 ${target}：连接被拒绝，请检查主机、端口和 SSH 服务。`)
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return new SshError('HOST_NOT_FOUND', `无法连接 ${target}：找不到主机，请检查地址。`)
  }
  if (code === 'ETIMEDOUT' || error?.level === 'client-timeout') {
    return new SshError('CONNECT_TIMEOUT', `连接 ${target} 超时，请检查网络、防火墙或端口。`)
  }
  if (error?.level === 'client-authentication' || /authentication methods failed/i.test(message)) {
    return new SshError(
      'AUTH_FAILED',
      `登录 ${target} 失败：请检查用户名、${authLabel(profile)}或服务器允许的认证方式。`,
    )
  }
  if (/host fingerprint verification failed/i.test(message)) {
    return new SshError('HOST_KEY_MISMATCH', `连接 ${target} 的主机指纹与已保存的不一致。`)
  }
  if (/private key/i.test(message) && /(parse|decrypt|invalid|unsupported)/i.test(message)) {
    return new SshError('INVALID_PRIVATE_KEY', `私钥无法解析或口令不正确：${message}`)
  }
  return new SshError('CONNECTION_FAILED', `连接 ${target} 失败：${message}`)
}

function partialTail(partial) {
  const parts = []
  if (partial.stdout) parts.push(partial.stdout)
  if (partial.stderr) parts.push(partial.stderr)
  const text = parts.join('\n').trim()
  if (!text) return ''
  return text.length > ERROR_OUTPUT_TAIL ? `…${text.slice(-ERROR_OUTPUT_TAIL)}` : text
}

/**
 * Open one authenticated SSH connection. The caller owns the returned client
 * and must close it.
 *
 * Host-key verification is trust-on-first-use: a known pin must match, while
 * an unpinned profile records the observed fingerprint after the handshake.
 */
export async function connect(profile, secret, options = {}) {
  const target = targetOf(profile)
  const knownHostKey = options.knownHostKey || null
  const connectTimeoutMs = clamp(options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS, 1_000, 120_000)
  let actualHostKey = null
  let hostKeyMismatch = false
  let settled = false
  const client = new Client()

  const config = {
    host: profile.host,
    port: profile.port,
    username: profile.username,
    readyTimeout: connectTimeoutMs,
    keepaliveInterval: 0,
    hostHash: 'sha256',
    hostVerifier: (hashedKey) => {
      actualHostKey = openSshFingerprint(hashedKey)
      if (knownHostKey && actualHostKey !== knownHostKey) {
        hostKeyMismatch = true
        return false
      }
      return true
    },
  }

  if (secret.authType === 'password') {
    config.password = secret.password
    config.tryKeyboard = true
    config.onKeyboardInteractive = (_name, _instructions, _lang, prompts, finish) => {
      finish(prompts.map(() => secret.password))
    }
  } else {
    config.privateKey = secret.privateKey
    if (secret.passphrase) config.passphrase = secret.passphrase
  }

  await new Promise((resolve, reject) => {
    const fail = (error) => {
      if (settled) return
      settled = true
      if (hostKeyMismatch) {
        reject(
          new SshError(
            'HOST_KEY_MISMATCH',
            `连接 ${target} 的主机指纹与已保存的不一致。服务器可能已重装或密钥已更换；确认无误后可在连接编辑页重置主机指纹。`,
            { expected: knownHostKey, actual: actualHostKey },
          ),
        )
      } else {
        reject(connectionError(profile, error))
      }
    }
    client.on('error', (error) => {
      if (!settled) fail(error)
    })
    client.once('ready', () => {
      if (settled) return
      settled = true
      resolve()
    })
    try {
      client.connect(config)
    } catch (error) {
      fail(error)
    }
  }).catch((error) => {
    try {
      client.end()
    } catch {}
    throw error
  })

  return { client, hostKey: actualHostKey, target }
}

function appendChunk(chunks, state, streamName, chunk, limit) {
  const size = Buffer.byteLength(chunk, 'utf8')
  if (state[streamName] >= limit) {
    state[`${streamName}Truncated`] = true
    return
  }
  const remaining = limit - state[streamName]
  if (size <= remaining) {
    chunks[streamName].push(chunk)
    state[streamName] += size
    return
  }
  const slice = chunk.slice(0, remaining)
  chunks[streamName].push(slice)
  state[streamName] += Buffer.byteLength(slice, 'utf8')
  state[`${streamName}Truncated`] = true
}

/**
 * Run one non-interactive command over an authenticated connection.
 */
export async function execCommand(client, command, options = {}) {
  const timeoutMs = clamp(options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS, 1_000, MAX_COMMAND_TIMEOUT_MS)
  const maxStdoutBytes = clamp(options.maxStdoutBytes ?? MAX_STDOUT_BYTES, 1_024, 4 * 1_024 * 1_024)
  const maxStderrBytes = clamp(options.maxStderrBytes ?? MAX_STDERR_BYTES, 1_024, 4 * 1_024 * 1_024)
  const signal = options.signal
  const startedAt = Date.now()
  const chunks = { stdout: [], stderr: [] }
  const state = { stdout: 0, stderr: 0, stdoutTruncated: false, stderrTruncated: false }
  const partial = () => ({
    stdout: chunks.stdout.join(''),
    stderr: chunks.stderr.join(''),
    stdoutTruncated: state.stdoutTruncated,
    stderrTruncated: state.stderrTruncated,
  })

  return await new Promise((resolve, reject) => {
    let settled = false
    let stream = null
    let timer = null
    let onAbort = null

    const settle = (fn) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      if (signal && onAbort) signal.removeEventListener('abort', onAbort)
      fn()
    }

    const fail = (code, message) => {
      const tail = partialTail(partial())
      settle(() => {
        reject(new SshError(code, tail ? `${message}\n--- 已收到的输出 ---\n${tail}` : message, partial()))
      })
    }

    onAbort = () => {
      try {
        stream?.close()
      } catch {}
      try {
        client.end()
      } catch {}
      fail('CANCELLED', '远程命令已取消。')
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true })

    timer = setTimeout(() => {
      try {
        stream?.close()
      } catch {}
      try {
        client.end()
      } catch {}
      fail('COMMAND_TIMEOUT', `远程命令超时（${timeoutMs} ms）。`)
    }, timeoutMs)

    try {
      client.exec(command, (error, nextStream) => {
        if (settled) {
          try {
            nextStream?.close()
          } catch {}
          return
        }
        if (error) {
          settle(() => reject(new SshError('EXEC_FAILED', `无法执行远程命令：${error.message}`)))
          return
        }
        stream = nextStream
        stream.setEncoding('utf8')
        stream.stderr.setEncoding('utf8')
        stream.on('data', (chunk) => appendChunk(chunks, state, 'stdout', chunk, maxStdoutBytes))
        stream.stderr.on('data', (chunk) => appendChunk(chunks, state, 'stderr', chunk, maxStderrBytes))
        stream.on('close', (code, signalName) => {
          settle(() => {
            resolve({
              exitCode: typeof code === 'number' ? code : -1,
              signal: signalName || '',
              durationMs: Date.now() - startedAt,
              ...partial(),
            })
          })
        })
        stream.on('error', (streamError) => {
          fail('EXEC_FAILED', `远程命令执行失败：${streamError.message}`)
        })
        if (typeof options.stdin === 'string' && options.stdin.length > 0) {
          stream.write(options.stdin)
          stream.end()
        }
      })
    } catch (error) {
      fail('EXEC_FAILED', `无法执行远程命令：${error.message}`)
    }
  })
}

export async function testConnection(profile, secret, options = {}) {
  const startedAt = Date.now()
  const { client, hostKey } = await connect(profile, secret, options)
  try {
    return { latencyMs: Date.now() - startedAt, hostKey }
  } finally {
    try {
      client.end()
    } catch {}
  }
}

export function closeClient(client) {
  try {
    client.end()
  } catch {}
}
