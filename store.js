import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

const FORMAT_VERSION = 2
const DATA_DIR = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'remote-ssh')
const DATA_FILE = join(DATA_DIR, 'profiles.json')
const DEFAULT_HOST_LABEL = '默认主机'
const ELEVATION_MODES = ['none', 'sudo', 'sudo-i']
const TRANSPORTS = ['ssh', 'sangfor']
const SANGFOR_ACCOUNTS = ['root', 'user']

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}

function assertTimestamp(value, field) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO timestamp`)
  }
}

function assertStoredHost(host, groupId) {
  if (!isRecord(host)) throw new Error(`group ${groupId}: host entry must be an object`)
  assertString(host.id, `group ${groupId}: host.id`)
  assertString(host.label, `group ${groupId}: host.label`)
  assertString(host.host, `group ${groupId}: host.host`)
  assertString(host.username, `group ${groupId}: host.username`)
  if (!Number.isInteger(host.port) || host.port < 1 || host.port > 65535) {
    throw new Error(`group ${groupId}: host ${host.id} has an invalid port`)
  }
  if (host.authType !== 'password' && host.authType !== 'privateKey') {
    throw new Error(`group ${groupId}: host ${host.id} has an unknown authType`)
  }
  if (host.hostKey !== undefined && host.hostKey !== null && typeof host.hostKey !== 'string') {
    throw new Error(`group ${groupId}: host ${host.id} has an invalid hostKey`)
  }
  if (host.elevation !== undefined && !ELEVATION_MODES.includes(host.elevation)) {
    throw new Error(`group ${groupId}: host ${host.id} has an unknown elevation mode`)
  }
  const transport = host.transport ?? 'ssh'
  if (!TRANSPORTS.includes(transport)) {
    throw new Error(`group ${groupId}: host ${host.id} has an unknown transport`)
  }
  if (host.account !== undefined && !SANGFOR_ACCOUNTS.includes(host.account)) {
    throw new Error(`group ${groupId}: host ${host.id} has an unknown account`)
  }
  if (host.asset !== undefined && typeof host.asset !== 'string') {
    throw new Error(`group ${groupId}: host ${host.id} has an invalid asset`)
  }
  if (host.assetIp !== undefined && typeof host.assetIp !== 'string') {
    throw new Error(`group ${groupId}: host ${host.id} has an invalid assetIp`)
  }
  if (host.assetPage !== undefined && (!Number.isInteger(host.assetPage) || host.assetPage < 1)) {
    throw new Error(`group ${groupId}: host ${host.id} has an invalid assetPage`)
  }
  if (host.targetUsername !== undefined && typeof host.targetUsername !== 'string') {
    throw new Error(`group ${groupId}: host ${host.id} has an invalid targetUsername`)
  }
  if (transport === 'sangfor') {
    const hasIp = typeof host.assetIp === 'string' && host.assetIp.trim().length > 0
    const hasLegacyNumber = typeof host.asset === 'string' && /^\d+$/.test(host.asset)
    if (!hasIp && !hasLegacyNumber) {
      throw new Error(`group ${groupId}: host ${host.id} needs a Sangfor asset IP`)
    }
  }
  assertTimestamp(host.createdAt, `group ${groupId}: host.createdAt`)
  assertTimestamp(host.updatedAt, `group ${groupId}: host.updatedAt`)
}

function assertStoredGroup(group) {
  if (!isRecord(group)) throw new Error('group entry must be an object')
  assertString(group.id, 'group.id')
  assertString(group.name, 'group.name')
  if (typeof group.note !== 'string') throw new Error(`group ${group.id} has an invalid note`)
  assertTimestamp(group.createdAt, `group ${group.id}: group.createdAt`)
  assertTimestamp(group.updatedAt, `group ${group.id}: group.updatedAt`)
  if (!Array.isArray(group.hosts)) throw new Error(`group ${group.id} has no host list`)
  for (const host of group.hosts) assertStoredHost(host, group.id)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function timestampSuffix() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/** Convert the old one-host-per-profile format into one-host groups. */
function migrateVersionOne(profiles) {
  if (!Array.isArray(profiles)) throw new Error('version 1 data must contain a profiles array')
  return profiles.map((profile) => {
    if (!isRecord(profile)) throw new Error('version 1 profile must be an object')
    assertString(profile.id, 'profile.id')
    assertString(profile.name, 'profile.name')
    assertString(profile.host, 'profile.host')
    assertString(profile.username, 'profile.username')
    if (!Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535) {
      throw new Error(`profile ${profile.id} has an invalid port`)
    }
    if (profile.authType !== 'password' && profile.authType !== 'privateKey') {
      throw new Error(`profile ${profile.id} has an unknown authType`)
    }
    if (typeof profile.note !== 'string') throw new Error(`profile ${profile.id} has an invalid note`)
    assertTimestamp(profile.createdAt, `profile ${profile.id}: createdAt`)
    assertTimestamp(profile.updatedAt, `profile ${profile.id}: updatedAt`)
    return {
      id: profile.id,
      name: profile.name,
      note: profile.note,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      hosts: [
        {
          // Keeping the profile id as the host id preserves the existing
          // `remote-ssh/<id>` credential record across the migration.
          id: profile.id,
          label: DEFAULT_HOST_LABEL,
          host: profile.host,
          port: profile.port,
          username: profile.username,
          authType: profile.authType,
          hostKey: profile.hostKey ?? null,
          elevation: 'none',
          transport: 'ssh',
          asset: '',
          assetIp: '',
          assetPage: 1,
          account: 'root',
          targetUsername: '',
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      ],
    }
  })
}

function validateGroups(groups) {
  const groupIds = new Set()
  const groupNames = new Set()
  const hostIds = new Set()
  for (const group of groups) {
    assertStoredGroup(group)
    if (groupIds.has(group.id)) throw new Error(`duplicate group id: ${group.id}`)
    groupIds.add(group.id)
    const name = group.name.toLowerCase()
    if (groupNames.has(name)) throw new Error(`duplicate group name: ${group.name}`)
    groupNames.add(name)
    const labels = new Set()
    for (const host of group.hosts) {
      if (hostIds.has(host.id)) throw new Error(`duplicate host id: ${host.id}`)
      hostIds.add(host.id)
      const label = host.label.toLowerCase()
      if (labels.has(label)) throw new Error(`group ${group.id} has duplicate host label: ${host.label}`)
      labels.add(label)
    }
  }
}

/**
 * Metadata-only store for SSH groups. Secrets stay in the credential service
 * and never enter this file.
 */
export class ProfileStore {
  constructor() {
    this.groups = []
    this.queue = Promise.resolve()
    this.migrated = false
    this.ready = this.load().then(async () => {
      if (!this.migrated) return
      try {
        await this.persist()
      } catch (error) {
        console.error('[remote-ssh] failed to persist migrated connection data', error)
      }
    })
  }

  async load() {
    let text
    try {
      text = await readFile(DATA_FILE, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') return
      throw new Error(`无法读取 SSH 连接数据（${DATA_FILE}）：${error.message}`)
    }
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      throw new Error(`SSH 连接数据不是合法 JSON（${DATA_FILE}）：${error.message}`)
    }
    if (!isRecord(parsed)) throw new Error(`SSH 连接数据格式无法识别（${DATA_FILE}）`)

    if (parsed.version === 1 && Array.isArray(parsed.profiles)) {
      await copyFile(DATA_FILE, `${DATA_FILE}.v1-${timestampSuffix()}.bak`).catch((error) => {
        console.error('[remote-ssh] failed to back up version 1 connection data', error)
      })
      this.groups = migrateVersionOne(parsed.profiles)
      validateGroups(this.groups)
      this.migrated = true
      return
    }

    if (parsed.version === FORMAT_VERSION && Array.isArray(parsed.groups)) {
      validateGroups(parsed.groups)
      this.groups = parsed.groups.map((group) => ({
        ...clone(group),
        hosts: group.hosts.map((host) => ({
          ...clone(host),
          elevation: host.elevation ?? 'none',
          transport: host.transport ?? 'ssh',
          asset: host.asset ?? '',
          assetIp: host.assetIp ?? '',
          assetPage: host.assetPage ?? 1,
          account: host.account ?? 'root',
          targetUsername: host.targetUsername ?? '',
        })),
      }))
      return
    }

    throw new Error(`SSH 连接数据版本无法识别（${DATA_FILE}）：${String(parsed.version)}`)
  }

  list() {
    return this.groups.map(clone)
  }

  getGroup(id) {
    const found = this.groups.find((group) => group.id === id)
    return found ? clone(found) : undefined
  }

  findGroupByName(name) {
    const needle = String(name).toLowerCase()
    return this.groups.find((group) => group.name.toLowerCase() === needle)
  }

  getHost(groupId, hostId) {
    const group = this.groups.find((entry) => entry.id === groupId)
    const host = group?.hosts.find((entry) => entry.id === hostId)
    return host ? clone(host) : undefined
  }

  allHostIds() {
    const ids = new Set()
    for (const group of this.groups) for (const host of group.hosts) ids.add(host.id)
    return ids
  }

  buildGroup(fields) {
    const now = new Date().toISOString()
    return {
      id: this.newGroupId(),
      name: fields.name,
      note: fields.note,
      createdAt: now,
      updatedAt: now,
      hosts: [],
    }
  }

  buildHost(fields) {
    const now = new Date().toISOString()
    return {
      id: this.newHostId(),
      label: fields.label,
      host: fields.host,
      port: fields.port,
      username: fields.username,
      authType: fields.authType,
      hostKey: null,
      elevation: fields.elevation ?? 'none',
      transport: fields.transport ?? 'ssh',
      asset: fields.asset ?? '',
      assetIp: fields.assetIp ?? '',
      assetPage: fields.assetPage ?? 1,
      account: fields.account ?? 'root',
      targetUsername: fields.targetUsername ?? '',
      createdAt: now,
      updatedAt: now,
    }
  }

  newGroupId() {
    for (;;) {
      const id = `ssh-${randomBytes(4).toString('hex')}`
      if (!this.groups.some((group) => group.id === id)) return id
    }
  }

  newHostId() {
    const used = this.allHostIds()
    for (;;) {
      const id = `host-${randomBytes(4).toString('hex')}`
      if (!used.has(id)) return id
    }
  }

  async insertGroup(group) {
    if (this.findGroupByName(group.name)) throw new Error(`连接组名称已存在：${group.name}`)
    this.groups.push({ ...clone(group), hosts: [] })
    await this.persist()
    return clone(group)
  }

  async updateGroup(id, patch) {
    const index = this.groups.findIndex((group) => group.id === id)
    if (index === -1) throw new Error(`连接组不存在：${id}`)
    const current = this.groups[index]
    const next = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      hosts: current.hosts,
    }
    const duplicate = this.groups.find(
      (group, otherIndex) => otherIndex !== index && group.name.toLowerCase() === next.name.toLowerCase(),
    )
    if (duplicate) throw new Error(`连接组名称已存在：${next.name}`)
    this.groups[index] = next
    await this.persist()
    return clone(next)
  }

  async removeGroup(id) {
    const index = this.groups.findIndex((group) => group.id === id)
    if (index === -1) return undefined
    const [removed] = this.groups.splice(index, 1)
    await this.persist()
    return clone(removed)
  }

  async addHost(groupId, host) {
    const group = this.groups.find((entry) => entry.id === groupId)
    if (!group) throw new Error(`连接组不存在：${groupId}`)
    if (group.hosts.some((entry) => entry.label.toLowerCase() === host.label.toLowerCase())) {
      throw new Error(`主机标签已存在：${host.label}`)
    }
    if (this.allHostIds().has(host.id)) throw new Error(`主机 id 已存在：${host.id}`)
    group.hosts.push(clone(host))
    group.updatedAt = new Date().toISOString()
    await this.persist()
    return clone(host)
  }

  async updateHost(groupId, hostId, patch) {
    const group = this.groups.find((entry) => entry.id === groupId)
    if (!group) throw new Error(`连接组不存在：${groupId}`)
    const index = group.hosts.findIndex((entry) => entry.id === hostId)
    if (index === -1) throw new Error(`主机不存在：${hostId}`)
    const current = group.hosts[index]
    const next = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    }
    if (patch.hostKey === null) next.hostKey = null
    else if (typeof patch.hostKey === 'string') next.hostKey = patch.hostKey
    else next.hostKey = current.hostKey ?? null
    const duplicate = group.hosts.find(
      (host, otherIndex) => otherIndex !== index && host.label.toLowerCase() === next.label.toLowerCase(),
    )
    if (duplicate) throw new Error(`主机标签已存在：${next.label}`)
    group.hosts[index] = next
    group.updatedAt = new Date().toISOString()
    await this.persist()
    return clone(next)
  }

  async removeHost(groupId, hostId) {
    const group = this.groups.find((entry) => entry.id === groupId)
    if (!group) throw new Error(`连接组不存在：${groupId}`)
    const index = group.hosts.findIndex((entry) => entry.id === hostId)
    if (index === -1) return undefined
    const [removed] = group.hosts.splice(index, 1)
    group.updatedAt = new Date().toISOString()
    await this.persist()
    return clone(removed)
  }

  async setHostKey(groupId, hostId, hostKey) {
    return this.updateHost(groupId, hostId, { hostKey })
  }

  async persist() {
    const payload = `${JSON.stringify({ version: FORMAT_VERSION, groups: this.groups }, null, 2)}\n`
    const run = this.queue.then(async () => {
      await mkdir(DATA_DIR, { recursive: true, mode: 0o700 })
      const temporary = `${DATA_FILE}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
      await writeFile(temporary, payload, { encoding: 'utf8', mode: 0o600 })
      try {
        await rename(temporary, DATA_FILE)
      } catch (error) {
        if (error?.code === 'EEXIST' || error?.code === 'EPERM' || error?.code === 'EACCES') {
          await rm(DATA_FILE, { force: true })
          await rename(temporary, DATA_FILE)
        } else {
          await rm(temporary, { force: true }).catch(() => {})
          throw error
        }
      }
    })
    this.queue = run.catch(() => {})
    return run
  }
}

export const STORAGE_PATH = DATA_FILE
