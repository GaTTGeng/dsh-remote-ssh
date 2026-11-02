import { SshError } from './ssh-client.js'

const PREFIX = '/remote-ssh/api'
const MAX_BODY_BYTES = 256 * 1024

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function sendError(res, status, code, message) {
  sendJson(res, status, { ok: false, error: { code, message } })
}

function methodNotAllowed(res, allow) {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: `只支持 ${allow}` } }))
}

function normalizeError(error) {
  if (error instanceof SshError) {
    return { code: error.code, message: error.message }
  }
  return { code: 'INTERNAL', message: `服务器内部错误：${error?.message || String(error)}` }
}

function statusFor(code) {
  switch (code) {
    case 'VALIDATION':
    case 'INVALID_PRIVATE_KEY':
    case 'AMBIGUOUS_NAME':
    case 'AMBIGUOUS_HOST':
    case 'HOST_REQUIRED':
    case 'NOTE_TOO_LONG':
    case 'UNSUPPORTED_MEDIA_TYPE':
    case 'PAYLOAD_TOO_LARGE':
    case 'BAD_REQUEST':
      return 400
    case 'NOT_FOUND':
    case 'HOST_NOT_FOUND':
      return 404
    case 'NO_HOSTS':
    case 'NO_SANGFOR_HOST':
    case 'DUPLICATE_NAME':
    case 'CREDENTIAL_MISSING':
    case 'CREDENTIAL_MISMATCH':
      return 409
    case 'SANGFOR_ASSET_NOT_FOUND':
      return 404
    case 'AUTH_FAILED':
    case 'CONNECTION_REFUSED':
    case 'HOST_NOT_FOUND_CONNECT':
    case 'CONNECT_TIMEOUT':
    case 'CONNECTION_FAILED':
    case 'HOST_KEY_MISMATCH':
    case 'COMMAND_TIMEOUT':
    case 'SANGFOR_TIMEOUT':
    case 'SANGFOR_TARGET_AUTH':
    case 'SANGFOR_COMMAND_FAILED':
    case 'SANGFOR_SEARCH_FAILED':
      return 502
    default:
      return 500
  }
}

async function readJsonBody(req) {
  const mediaType = String(req.headers['content-type'] || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()
  if (mediaType !== 'application/json') {
    throw new SshError('UNSUPPORTED_MEDIA_TYPE', '请求必须使用 application/json。')
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      req.resume()
      throw new SshError('PAYLOAD_TOO_LARGE', '请求体过大。')
    }
    chunks.push(chunk)
  }
  let parsed
  try {
    parsed = JSON.parse(Buffer.concat(chunks, size).toString('utf8'))
  } catch {
    throw new SshError('BAD_REQUEST', '请求体不是合法 JSON。')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SshError('BAD_REQUEST', '请求体必须是 JSON 对象。')
  }
  return parsed
}

/**
 * Browser-facing API over the same service the agent tools use. Every route
 * passes the composition's connection trust fence before reading data.
 */
export function createApiHandler({ service, connection, log = console }) {
  return async function handle(req, res) {
    try {
      const rejection = connection?.requestRejection?.(req)
      if (rejection) {
        res.statusCode = rejection
        res.end()
        return
      }
      const url = new URL(req.url || '/', 'http://localhost')
      const pathname = url.pathname
      if (!pathname.startsWith(PREFIX)) {
        sendError(res, 404, 'NOT_FOUND', '未知接口。')
        return
      }
      const rest = pathname.slice(PREFIX.length) || '/'

      if (rest === '/profiles' || rest === '/profiles/') {
        if (req.method === 'GET') {
          sendJson(res, 200, { ok: true, profiles: await service.list() })
          return
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req)
          sendJson(res, 200, { ok: true, profile: await service.create(body) })
          return
        }
        methodNotAllowed(res, 'GET, POST')
        return
      }

      const hostSangforSearch = /^\/profiles\/([^/]+)\/hosts\/([^/]+)\/sangfor\/search\/?$/.exec(rest)
      if (hostSangforSearch) {
        if (req.method !== 'POST') {
          methodNotAllowed(res, 'POST')
          return
        }
        const groupId = decodeURIComponent(hostSangforSearch[1])
        const hostId = decodeURIComponent(hostSangforSearch[2])
        const body = await readJsonBody(req)
        const results = await service.searchSangforAssets(groupId, hostId, body.query)
        sendJson(res, 200, { ok: true, results })
        return
      }

      const hostTest = /^\/profiles\/([^/]+)\/hosts\/([^/]+)\/test\/?$/.exec(rest)
      if (hostTest) {
        if (req.method !== 'POST') {
          methodNotAllowed(res, 'POST')
          return
        }
        const groupId = decodeURIComponent(hostTest[1])
        const hostId = decodeURIComponent(hostTest[2])
        try {
          const result = await service.testHost(groupId, hostId)
          sendJson(res, 200, { ok: true, result: { success: true, ...result } })
        } catch (error) {
          if (error instanceof SshError && ['NOT_FOUND', 'STORE_LOAD_FAILED'].includes(error.code)) {
            throw error
          }
          const normalized = normalizeError(error)
          sendJson(res, 200, {
            ok: true,
            result: { success: false, error: { code: normalized.code, message: normalized.message } },
          })
        }
        return
      }

      const hostRoute = /^\/profiles\/([^/]+)\/hosts(?:\/([^/]+))?\/?$/.exec(rest)
      if (hostRoute) {
        const groupId = decodeURIComponent(hostRoute[1])
        const hostId = hostRoute[2] === undefined ? undefined : decodeURIComponent(hostRoute[2])
        if (hostId === undefined) {
          if (req.method !== 'POST') {
            methodNotAllowed(res, 'POST')
            return
          }
          const body = await readJsonBody(req)
          sendJson(res, 200, { ok: true, profile: await service.addHost(groupId, body) })
          return
        }
        if (req.method === 'PUT') {
          const body = await readJsonBody(req)
          sendJson(res, 200, { ok: true, profile: await service.updateHost(groupId, hostId, body) })
          return
        }
        if (req.method === 'DELETE') {
          sendJson(res, 200, { ok: true, profile: await service.removeHost(groupId, hostId) })
          return
        }
        methodNotAllowed(res, 'PUT, DELETE')
        return
      }

      const groupTest = /^\/profiles\/([^/]+)\/test\/?$/.exec(rest)
      if (groupTest) {
        if (req.method !== 'POST') {
          methodNotAllowed(res, 'POST')
          return
        }
        const results = await service.testGroup(decodeURIComponent(groupTest[1]))
        sendJson(res, 200, { ok: true, results })
        return
      }

      const groupRoute = /^\/profiles\/([^/]+)\/?$/.exec(rest)
      if (groupRoute) {
        const id = decodeURIComponent(groupRoute[1])
        if (req.method === 'GET') {
          sendJson(res, 200, { ok: true, profile: await service.get(id) })
          return
        }
        if (req.method === 'PUT') {
          const body = await readJsonBody(req)
          sendJson(res, 200, { ok: true, profile: await service.update(id, body) })
          return
        }
        if (req.method === 'DELETE') {
          sendJson(res, 200, { ok: true, removed: await service.remove(id) })
          return
        }
        methodNotAllowed(res, 'GET, PUT, DELETE')
        return
      }

      sendError(res, 404, 'NOT_FOUND', '未知接口。')
    } catch (error) {
      const normalized = normalizeError(error)
      const status = statusFor(normalized.code)
      if (status >= 500) log.error?.('[remote-ssh] api error', error)
      try {
        sendError(res, status, normalized.code, normalized.message)
      } catch {}
    }
  }
}
