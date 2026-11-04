// HomeCloud — backend
// Fica entre o site e o Nextcloud:
//   • faz o login no Nextcloud e guarda uma "senha de app" SÓ aqui no servidor;
//   • entrega ao navegador apenas um cookie de sessão httpOnly (nenhum token no JavaScript);
//   • traduz pedidos simples (/api/...) para WebDAV/OCS do Nextcloud;
//   • serve os arquivos do site (pasta public/).

import http from 'node:http'
import { readFile, writeFile, mkdir, stat, statfs, readdir } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { randomBytes, createHash } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import {
  FILE_PROPS,
  MEDIA_PROPS,
  TRASH_PROPS,
  propfindBody,
  favoritesReportBody,
  proppatchFavoriteBody,
  searchBody,
  whereNameLike,
  whereNotFolder,
  whereMedia,
  parseMultistatus,
  relFromHref,
  toFileItem,
  toMediaItem,
  toTrashItem,
  toUser,
  sharesByPath,
  permissionFromOcs,
  permissionToOcs,
  toActivity,
  baseName,
  parentOf,
  colorFor,
  kindFromName,
} from './lib/mapping.mjs'

// ───────────────────────────── Configuração ─────────────────────────────
const PORT = Number(process.env.PORT) || 3000
const NC = (process.env.NC_URL || 'http://nextcloud').replace(/\/$/, '')
const PUBLIC_DIR = path.resolve(process.env.PUBLIC_DIR || 'public')
const DATA_DIR = path.resolve(process.env.DATA_DIR || '/data')
const FAMILY_GROUP = process.env.FAMILY_GROUP || 'Familia'
const ADMIN_GROUP = process.env.ADMIN_GROUP || 'admin'
const PHOTOS_FOLDER = '/' + (process.env.PHOTOS_FOLDER || 'Fotos').replace(/^\/|\/$/g, '')
const THERMAL_DIR = process.env.THERMAL_DIR || '/host/thermal'
const SESSION_DAYS = 30
const COOKIE = 'hc_sid'
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

// ───────────────────────────── Utilidades ─────────────────────────────
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const log = (...a) => console.log(new Date().toISOString(), ...a)
const sha = (s) => createHash('sha256').update(s).digest('hex')
const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/')

function cleanPath(p, { allowRoot = true } = {}) {
  const raw = String(p ?? '/')
  if (raw.includes('\0') || raw.split('/').includes('..')) throw new HttpError(400, 'Caminho inválido.')
  const norm = path.posix.normalize('/' + raw.replace(/^\/+/, ''))
  const out = norm.replace(/\/$/, '') || '/'
  if (!allowRoot && out === '/') throw new HttpError(400, 'Caminho inválido.')
  return out
}

function cleanName(n) {
  const name = String(n ?? '').trim()
  if (!name) throw new HttpError(400, 'O nome não pode ficar vazio.')
  if (/[\\/:*?"<>|]/.test(name) || name === '.' || name === '..') throw new HttpError(400, 'Evite os caracteres \\ / : * ? " < > |')
  if (name.length > 200) throw new HttpError(400, 'Nome muito longo.')
  return name
}

const joinPath = (parent, name) => (parent && parent !== '/' ? parent : '') + '/' + name

function send(res, status, data, headers = {}) {
  const body = data === undefined ? '' : JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(body)
}

async function readJson(req, limit = 1_000_000) {
  let size = 0
  const chunks = []
  for await (const c of req) {
    size += c.length
    if (size > limit) throw new HttpError(413, 'Pedido grande demais.')
    chunks.push(c)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'Pedido inválido.')
  }
}

function parseCookies(req) {
  const out = {}
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

const isHttps = (req) => req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()

function sessionCookie(req, value, maxAgeSec) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${isHttps(req) ? '; Secure' : ''}`
}

// ───────────────────────────── Sessões ─────────────────────────────
// Guardadas em memória e num arquivo (só o hash do cookie; permissão 600) para sobreviver a reinícios.
const sessions = new Map()

async function loadSessions() {
  try {
    const raw = JSON.parse(await readFile(SESSIONS_FILE, 'utf8'))
    for (const [k, v] of Object.entries(raw)) if (v.expires > Date.now()) sessions.set(k, v)
    log(`sessões restauradas: ${sessions.size}`)
  } catch {
    /* primeira execução */
  }
}

let saveTimer
function saveSessions() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await mkdir(DATA_DIR, { recursive: true })
      await writeFile(SESSIONS_FILE, JSON.stringify(Object.fromEntries(sessions)), { mode: 0o600 })
    } catch (e) {
      log('não foi possível salvar sessões:', e.message)
    }
  }, 400)
}

function getSession(req) {
  const sid = parseCookies(req)[COOKIE]
  if (!sid) return null
  const key = sha(sid)
  const s = sessions.get(key)
  if (!s) return null
  if (s.expires < Date.now()) {
    sessions.delete(key)
    saveSessions()
    return null
  }
  // renovação deslizante (no máximo 1x por hora)
  if (s.expires - Date.now() < (SESSION_DAYS * 86400000) - 3600000) {
    s.expires = Date.now() + SESSION_DAYS * 86400000
    saveSessions()
  }
  return { ...s, key }
}

function requireSession(req) {
  const s = getSession(req)
  if (!s) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.')
  return s
}

function requireAdmin(s) {
  if (!s.groups?.includes(ADMIN_GROUP)) throw new HttpError(403, 'Área restrita ao administrador.')
}

// Limite simples de tentativas de login por IP (5 erros em 10 minutos)
const loginFails = new Map()
function checkRate(ip) {
  const now = Date.now()
  const list = (loginFails.get(ip) || []).filter((t) => now - t < 600000)
  loginFails.set(ip, list)
  if (list.length >= 5) throw new HttpError(429, 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.')
}
const registerFail = (ip) => loginFails.set(ip, [...(loginFails.get(ip) || []), Date.now()])

// ───────────────────────────── Nextcloud ─────────────────────────────
const basic = (user, pass) => 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')

async function ncFetch(s, method, url, { headers = {}, body, ip, auth } = {}) {
  let res
  try {
    res = await fetch(url.startsWith('http') ? url : NC + url, {
      method,
      headers: {
        Authorization: auth || basic(s.loginName, s.appPassword),
        'OCS-APIRequest': 'true',
        ...(ip ? { 'X-Forwarded-For': ip } : {}),
        ...headers,
      },
      body,
      redirect: 'manual',
      ...(body && typeof body !== 'string' && !(body instanceof Buffer) ? { duplex: 'half' } : {}),
    })
  } catch (e) {
    log('Nextcloud inacessível:', e.message)
    throw new HttpError(502, 'Não foi possível falar com o servidor de arquivos agora. Tente em instantes.')
  }
  if (res.status === 401 && !auth) {
    // senha de app revogada no Nextcloud → encerra a sessão local
    if (s?.key) {
      sessions.delete(s.key)
      saveSessions()
    }
    throw new HttpError(401, 'Sua sessão expirou. Entre novamente.')
  }
  return res
}

async function ocs(s, method, p, body, opts = {}) {
  const sep = p.includes('?') ? '&' : '?'
  const res = await ncFetch(s, method, `/ocs/v2.php${p}${sep}format=json`, {
    ...opts,
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json
  try {
    json = await res.json()
  } catch {
    throw new HttpError(res.status === 404 ? 404 : 502, res.status === 404 ? 'Recurso não disponível no Nextcloud.' : 'Resposta inesperada do Nextcloud.')
  }
  const meta = json?.ocs?.meta
  if (!res.ok || (meta && Number(meta.statuscode) >= 400)) {
    throw new HttpError(res.status >= 400 ? res.status : Number(meta?.statuscode) || 400, meta?.message || 'O Nextcloud recusou o pedido.')
  }
  return json.ocs.data
}

const davFiles = (s, p = '/') => `/remote.php/dav/files/${encodeURIComponent(s.uid)}${encodePath(p)}`
const davTrash = (s, id = '') => `/remote.php/dav/trashbin/${encodeURIComponent(s.uid)}/trash${id ? '/' + encodeURIComponent(id) : ''}`

function davError(status, fallback = 'Não foi possível concluir. Tente novamente.') {
  if (status === 404) return new HttpError(404, 'Arquivo ou pasta não encontrado.')
  if (status === 403) return new HttpError(403, 'Você não tem permissão para isso.')
  if (status === 405 || status === 412) return new HttpError(409, 'Já existe um item com esse nome aqui.')
  if (status === 409) return new HttpError(409, 'A pasta de destino não existe.')
  if (status === 423) return new HttpError(423, 'Este arquivo está em uso. Tente daqui a pouco.')
  if (status === 507) return new HttpError(507, 'Seu espaço acabou. Libere espaço ou peça mais ao administrador.')
  return new HttpError(status >= 400 && status < 600 ? status : 502, fallback)
}

async function dav(s, method, url, { body, headers = {}, ok = [200, 201, 204, 207] } = {}) {
  const res = await ncFetch(s, method, url, {
    body,
    headers: body && typeof body === 'string' ? { 'Content-Type': 'application/xml; charset=utf-8', ...headers } : headers,
  })
  if (!ok.includes(res.status)) {
    await res.body?.cancel().catch(() => {})
    throw davError(res.status)
  }
  return res
}

async function davXml(s, method, url, body, depth = '1') {
  const res = await dav(s, method, url, { body, headers: { Depth: depth } })
  return parseMultistatus(await res.text())
}

async function mySharesMap(s) {
  try {
    return sharesByPath(await ocs(s, 'GET', '/apps/files_sharing/api/v1/shares'))
  } catch {
    return new Map()
  }
}

async function listFolder(s, p) {
  const [entries, shares] = await Promise.all([davXml(s, 'PROPFIND', davFiles(s, p), propfindBody()), mySharesMap(s)])
  return entries
    .filter((e) => relFromHref(s.uid, e.href) !== p)
    .map((e) => toFileItem(s.uid, e, shares, FAMILY_GROUP))
}

async function getItem(s, p) {
  const entries = await davXml(s, 'PROPFIND', davFiles(s, p), propfindBody(), '0')
  if (!entries[0]) throw new HttpError(404, 'Arquivo ou pasta não encontrado.')
  return toFileItem(s.uid, entries[0], await mySharesMap(s), FAMILY_GROUP)
}

async function search(s, where, opts = {}) {
  const entries = await davXml(s, 'SEARCH', '/remote.php/dav/', searchBody(s.uid, { where, ...opts }), '0')
  return entries
}

async function exists(s, p) {
  const res = await ncFetch(s, 'PROPFIND', davFiles(s, p), { headers: { Depth: '0' } })
  await res.body?.cancel().catch(() => {})
  return res.status === 207
}

async function uniqueName(s, parent, name) {
  if (!(await exists(s, joinPath(parent, name)))) return name
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 2; i < 100; i++) {
    const candidate = `${stem} (${i})${ext}`
    if (!(await exists(s, joinPath(parent, candidate)))) return candidate
  }
  return `${stem} (${Date.now()})${ext}`
}

async function ensureFolder(s, p) {
  const parts = p.split('/').filter(Boolean)
  let cur = ''
  for (const part of parts) {
    cur += '/' + part
    const res = await ncFetch(s, 'MKCOL', davFiles(s, cur))
    await res.body?.cancel().catch(() => {})
    if (![201, 405].includes(res.status)) throw davError(res.status)
  }
}

async function userDetails(s) {
  const d = await ocs(s, 'GET', `/cloud/users/${encodeURIComponent(s.uid)}`)
  return toUser(d, ADMIN_GROUP)
}

// ───────────────────────────── Rotas da API ─────────────────────────────
const routes = []
const route = (method, pattern, handler) => routes.push({ method, pattern, handler })

// ---- Autenticação
route('POST', '/api/auth/login', async (req, res) => {
  const ip = clientIp(req)
  checkRate(ip)
  const { email, password } = await readJson(req)
  const loginName = String(email || '').trim()
  if (!loginName || !password) throw new HttpError(400, 'Preencha usuário e senha.')

  // 1) troca a senha real por uma "senha de app" revogável (a senha real não é guardada)
  const r = await ncFetch(null, 'GET', '/ocs/v2.php/core/getapppassword?format=json', {
    auth: basic(loginName, String(password)),
    headers: { Accept: 'application/json' },
    ip,
  })
  if (r.status === 401) {
    registerFail(ip)
    throw new HttpError(401, 'Usuário ou senha incorretos. Confira e tente de novo.')
  }
  if (!r.ok) throw new HttpError(502, 'O servidor de arquivos não respondeu como esperado. Tente em instantes.')
  const appPassword = (await r.json())?.ocs?.data?.apppassword
  if (!appPassword) throw new HttpError(502, 'Não foi possível iniciar a sessão.')

  // 2) descobre o id do usuário e os grupos
  const tmp = { loginName, appPassword }
  const me = await ocs(tmp, 'GET', '/cloud/user')
  const uid = me.id
  const details = await ocs({ ...tmp, uid }, 'GET', `/cloud/users/${encodeURIComponent(uid)}`)

  const sid = randomBytes(32).toString('base64url')
  sessions.set(sha(sid), {
    uid,
    loginName,
    appPassword,
    groups: details.groups || [],
    expires: Date.now() + SESSION_DAYS * 86400000,
    createdAt: Date.now(),
  })
  saveSessions()
  loginFails.delete(ip)
  log(`login: ${uid}`)
  send(res, 200, toUser(details, ADMIN_GROUP), { 'Set-Cookie': sessionCookie(req, sid, SESSION_DAYS * 86400) })
})

route('POST', '/api/auth/logout', async (req, res) => {
  const s = getSession(req)
  if (s) {
    // revoga a senha de app no Nextcloud
    await ncFetch(s, 'DELETE', '/ocs/v2.php/core/apppassword').catch(() => {})
    sessions.delete(s.key)
    saveSessions()
  }
  send(res, 204, undefined, { 'Set-Cookie': sessionCookie(req, '', 0) })
})

route('GET', '/api/auth/me', async (req, res) => {
  const s = requireSession(req)
  const details = await ocs(s, 'GET', `/cloud/users/${encodeURIComponent(s.uid)}`)
  const live = sessions.get(s.key)
  if (live) live.groups = details.groups || []
  send(res, 200, toUser(details, ADMIN_GROUP))
})

route('PATCH', '/api/auth/me', async (req, res) => {
  const s = requireSession(req)
  const body = await readJson(req)
  if (body.avatarUrl !== undefined) throw new HttpError(400, 'A foto de perfil ainda não pode ser trocada por aqui. Use o Nextcloud por enquanto.')
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) throw new HttpError(400, 'O nome não pode ficar vazio.')
    await ocs(s, 'PUT', `/cloud/users/${encodeURIComponent(s.uid)}`, { key: 'displayname', value: name })
  }
  send(res, 200, await userDetails(s))
})

route('POST', '/api/auth/password', async (req, res) => {
  const s = requireSession(req)
  const { current, next } = await readJson(req)
  if (!current || !next) throw new HttpError(400, 'Preencha a senha atual e a nova.')
  if (String(next).length < 8) throw new HttpError(400, 'A nova senha precisa ter pelo menos 8 caracteres.')
  // usa a senha atual para confirmar a identidade (o Nextcloud exige confirmação recente)
  const auth = basic(s.loginName, String(current))
  const res2 = await ncFetch(s, 'PUT', `/ocs/v2.php/cloud/users/${encodeURIComponent(s.uid)}?format=json`, {
    auth,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'password', value: String(next) }),
  })
  if (res2.status === 401) throw new HttpError(400, 'A senha atual não confere.')
  const json = await res2.json().catch(() => null)
  const code = Number(json?.ocs?.meta?.statuscode)
  if (!res2.ok || code >= 400) {
    throw new HttpError(400, json?.ocs?.meta?.message || 'O Nextcloud não aceitou a nova senha. Tente uma senha mais forte.')
  }
  send(res, 204)
})

route('POST', '/api/auth/forgot', async () => {
  throw new HttpError(
    501,
    'A recuperação por e-mail ainda não está ligada. Peça para quem administra o servidor da família criar uma senha nova para você.',
  )
})

// ---- Arquivos
route('GET', '/api/files', async (req, res, url) => {
  const s = requireSession(req)
  const parent = url.searchParams.get('parent')
  send(res, 200, await listFolder(s, parent ? cleanPath(parent) : '/'))
})

route('GET', '/api/files/item', async (req, res, url) => {
  const s = requireSession(req)
  send(res, 200, await getItem(s, cleanPath(url.searchParams.get('path'), { allowRoot: false })))
})

route('GET', '/api/files/search', async (req, res, url) => {
  const s = requireSession(req)
  const q = String(url.searchParams.get('q') || '').trim()
  if (!q) return send(res, 200, [])
  const [entries, shares] = await Promise.all([search(s, whereNameLike(q), { orderBy: 'displayname', descending: false, limit: 100 }), mySharesMap(s)])
  send(res, 200, entries.map((e) => toFileItem(s.uid, e, shares, FAMILY_GROUP)).filter((f) => f.id !== '/'))
})

route('GET', '/api/files/recent', async (req, res, url) => {
  const s = requireSession(req)
  const limit = Math.min(50, Number(url.searchParams.get('limit')) || 6)
  const entries = await search(s, whereNotFolder(), { limit })
  send(res, 200, entries.map((e) => toFileItem(s.uid, e, null, FAMILY_GROUP)))
})

route('GET', '/api/files/favorites', async (req, res) => {
  const s = requireSession(req)
  const [entries, shares] = await Promise.all([davXml(s, 'REPORT', davFiles(s, '/'), favoritesReportBody()), mySharesMap(s)])
  send(res, 200, entries.map((e) => toFileItem(s.uid, e, shares, FAMILY_GROUP)))
})

route('POST', '/api/files/folder', async (req, res) => {
  const s = requireSession(req)
  const { parent, name } = await readJson(req)
  const p = joinPath(parent ? cleanPath(parent) : '/', cleanName(name))
  await dav(s, 'MKCOL', davFiles(s, p), { ok: [201] })
  send(res, 201, await getItem(s, p))
})

route('POST', '/api/files/rename', async (req, res) => {
  const s = requireSession(req)
  const { path: from, name } = await readJson(req)
  const src = cleanPath(from, { allowRoot: false })
  const dst = joinPath(parentOf(src) ?? '/', cleanName(name))
  if (dst !== src) {
    await dav(s, 'MOVE', davFiles(s, src), { headers: { Destination: NC + davFiles(s, dst), Overwrite: 'F' }, ok: [201, 204] })
  }
  send(res, 200, await getItem(s, dst))
})

route('POST', '/api/files/favorite', async (req, res) => {
  const s = requireSession(req)
  const { path: p, favorite } = await readJson(req)
  const target = cleanPath(p, { allowRoot: false })
  await dav(s, 'PROPPATCH', davFiles(s, target), { body: proppatchFavoriteBody(!!favorite) })
  send(res, 200, await getItem(s, target))
})

route('DELETE', '/api/files', async (req, res, url) => {
  const s = requireSession(req)
  const p = cleanPath(url.searchParams.get('path'), { allowRoot: false })
  await dav(s, 'DELETE', davFiles(s, p), { ok: [204] })
  send(res, 204)
})

// Upload: o corpo do pedido vai direto (em fluxo) para o Nextcloud, sem passar pela memória
route('PUT', '/api/upload', async (req, res, url) => {
  const s = requireSession(req)
  const parent = cleanPath(url.searchParams.get('parent') || '/')
  const name = cleanName(url.searchParams.get('name'))
  if (url.searchParams.get('mkdir') === '1') await ensureFolder(s, parent)
  const finalName = await uniqueName(s, parent, name)
  const p = joinPath(parent, finalName)
  const headers = {}
  if (req.headers['content-length']) headers['Content-Length'] = req.headers['content-length']
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']
  const mtime = Number(url.searchParams.get('mtime'))
  if (mtime > 0) headers['X-OC-MTime'] = String(Math.floor(mtime / 1000))
  const r = await ncFetch(s, 'PUT', davFiles(s, p), { headers, body: Readable.toWeb(req) })
  await r.body?.cancel().catch(() => {})
  if (![200, 201, 204].includes(r.status)) throw davError(r.status, 'O envio não foi concluído.')
  send(res, 201, await getItem(s, p))
})

// Download e streaming (com suporte a Range para vídeos)
route('GET', '/api/download', async (req, res, url) => {
  const s = requireSession(req)
  const p = cleanPath(url.searchParams.get('path'), { allowRoot: false })
  const headers = {}
  if (req.headers.range) headers.Range = req.headers.range
  const r = await ncFetch(s, 'GET', davFiles(s, p), { headers })
  if (![200, 206].includes(r.status)) {
    await r.body?.cancel().catch(() => {})
    throw davError(r.status)
  }
  const out = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = r.headers.get(h)
    if (v) out[h] = v
  }
  const inline = url.searchParams.get('inline') === '1'
  out['Content-Disposition'] = `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(baseName(p))}`
  if (inline) out['Content-Security-Policy'] = "default-src 'none'; media-src 'self'; img-src 'self'; style-src 'unsafe-inline'"
  res.writeHead(r.status, out)
  Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res)
})

// Miniaturas geradas pelo Nextcloud
route('GET', '/api/preview', async (req, res, url) => {
  const s = requireSession(req)
  const p = cleanPath(url.searchParams.get('path'), { allowRoot: false })
  const x = Math.min(2048, Math.max(32, Number(url.searchParams.get('x')) || 256))
  const y = Math.min(2048, Math.max(32, Number(url.searchParams.get('y')) || 256))
  const a = url.searchParams.get('a') === '1' ? 1 : 0
  const qs = new URLSearchParams({ file: p, x: String(x), y: String(y), a: String(a), forceIcon: '0' })
  const r = await ncFetch(s, 'GET', `/index.php/core/preview.png?${qs}`)
  if (r.status !== 200) {
    await r.body?.cancel().catch(() => {})
    throw new HttpError(404, 'Sem miniatura.')
  }
  res.writeHead(200, {
    'Content-Type': r.headers.get('content-type') || 'image/png',
    'Cache-Control': 'private, max-age=604800',
    'X-Content-Type-Options': 'nosniff',
  })
  Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res)
})

route('GET', '/api/storage', async (req, res) => {
  const s = requireSession(req)
  const [me, top] = await Promise.all([userDetails(s), listFolder(s, '/').catch(() => [])])
  const sorted = top.filter((f) => f.size > 0).sort((a, b) => b.size - a.size)
  const main = sorted.slice(0, 3)
  const rest = Math.max(0, me.usedBytes - main.reduce((t, f) => t + f.size, 0))
  const breakdown = main.map((f) => ({ label: f.name, bytes: f.size, kind: f.kind }))
  if (rest > 0) breakdown.push({ label: 'Outros', bytes: rest, kind: 'other' })
  send(res, 200, { usedBytes: me.usedBytes, quotaBytes: me.quotaBytes, breakdown })
})

// ---- Lixeira
async function trashList(s) {
  const entries = await davXml(s, 'PROPFIND', davTrash(s), propfindBody(TRASH_PROPS))
  return entries.filter((e) => !/\/trash\/?$/.test(e.href)).map(toTrashItem)
}

route('GET', '/api/trash', async (req, res) => {
  const s = requireSession(req)
  const list = await trashList(s)
  send(res, 200, list.sort((a, b) => b.trashedAt.localeCompare(a.trashedAt)))
})

route('POST', '/api/trash/restore', async (req, res) => {
  const s = requireSession(req)
  let { id } = await readJson(req)
  id = String(id || '')
  // "Desfazer" logo após excluir manda o caminho original — procuramos o item mais recente com esse caminho
  if (id.startsWith('/')) {
    const match = (await trashList(s)).filter((t) => t.originalPath === id).sort((a, b) => b.trashedAt.localeCompare(a.trashedAt))[0]
    if (!match) throw new HttpError(404, 'Não encontramos esse item na lixeira.')
    id = match.id
  }
  if (!id || id.includes('/')) throw new HttpError(400, 'Item inválido.')
  await dav(s, 'MOVE', davTrash(s, id), {
    headers: { Destination: `${NC}/remote.php/dav/trashbin/${encodeURIComponent(s.uid)}/restore/${encodeURIComponent(id)}` },
    ok: [201, 204],
  })
  send(res, 204)
})

route('DELETE', '/api/trash', async (req, res, url) => {
  const s = requireSession(req)
  const id = url.searchParams.get('id')
  if (id) {
    if (id.includes('/')) throw new HttpError(400, 'Item inválido.')
    await dav(s, 'DELETE', davTrash(s, id), { ok: [204] })
  } else {
    await dav(s, 'DELETE', davTrash(s), { ok: [204] })
  }
  send(res, 204)
})

// ---- Fotos e vídeos
route('GET', '/api/media', async (req, res) => {
  const s = requireSession(req)
  const entries = await search(s, whereMedia(), { limit: 2000, props: MEDIA_PROPS })
  send(res, 200, entries.map((e) => toMediaItem(s.uid, e)))
})

route('POST', '/api/media/favorite', async (req, res) => {
  const s = requireSession(req)
  const { path: p, favorite } = await readJson(req)
  const target = cleanPath(p, { allowRoot: false })
  await dav(s, 'PROPPATCH', davFiles(s, target), { body: proppatchFavoriteBody(!!favorite) })
  const entries = await davXml(s, 'PROPFIND', davFiles(s, target), propfindBody(MEDIA_PROPS), '0')
  send(res, 200, toMediaItem(s.uid, entries[0]))
})

route('GET', '/api/media/folder', async (req, res) => {
  requireSession(req)
  send(res, 200, { path: PHOTOS_FOLDER })
})

// ---- Família e compartilhamentos
route('GET', '/api/family', async (req, res) => {
  const s = requireSession(req)
  const me = await userDetails(s)
  const out = new Map([[me.id, me]])
  try {
    const data = await ocs(s, 'GET', '/apps/files_sharing/api/v1/sharees?search=&itemType=file&perPage=200&lookup=false&shareType[]=0')
    for (const u of [...(data?.exact?.users || []), ...(data?.users || [])]) {
      const id = u?.value?.shareWith
      if (id && !out.has(id)) {
        out.set(id, { id, name: u.label || id, email: '', role: 'member', color: colorFor(id), quotaBytes: 0, usedBytes: 0, createdAt: new Date().toISOString() })
      }
    }
  } catch {
    /* lista mínima */
  }
  // "Toda a família" como destino de compartilhamento (grupo do Nextcloud)
  out.set(`group:${FAMILY_GROUP}`, {
    id: `group:${FAMILY_GROUP}`, name: 'Toda a família', email: '', role: 'member', color: '#34d399', quotaBytes: 0, usedBytes: 0,
    createdAt: new Date().toISOString(), isGroup: true,
  })
  send(res, 200, [...out.values()])
})

function shareToItem(sh, direction) {
  const p = direction === 'with-me' ? sh.file_target : sh.path
  const folder = sh.item_type === 'folder'
  const kindName = baseName(p)
  return {
    id: p,
    name: kindName,
    kind: folder ? 'folder' : kindFromName(kindName, sh.mimetype || ''),
    parentId: parentOf(p),
    size: Number(sh.item_size || 0),
    modifiedAt: new Date((Number(sh.item_mtime) || Number(sh.stime) || Date.now() / 1000) * 1000).toISOString(),
    ownerId: sh.uid_owner,
    favorite: false,
    sharedWith: [],
  }
}

route('GET', '/api/shares', async (req, res, url) => {
  const s = requireSession(req)
  const direction = url.searchParams.get('direction') === 'by-me' ? 'by-me' : 'with-me'
  const list = await ocs(s, 'GET', `/apps/files_sharing/api/v1/shares${direction === 'with-me' ? '?shared_with_me=true' : ''}`)
  const byItem = new Map()
  for (const sh of list || []) {
    const type = Number(sh.share_type)
    if (type !== 0 && type !== 1) continue
    if (type === 1 && sh.share_with === FAMILY_GROUP) continue // aparece em "Pastas da família"
    const item = shareToItem(sh, direction)
    const e = byItem.get(item.id) || { id: `s-${sh.id}`, item, ownerId: sh.uid_owner, targets: [], sharedAt: new Date(Number(sh.stime) * 1000).toISOString() }
    e.targets.push({ userId: type === 1 ? `group:${sh.share_with}` : sh.share_with, permission: permissionFromOcs(sh.permissions) })
    e.item.sharedWith = e.targets
    byItem.set(item.id, e)
  }
  send(res, 200, [...byItem.values()])
})

route('GET', '/api/shares/family', async (req, res) => {
  const s = requireSession(req)
  const [mine, withMe] = await Promise.all([
    ocs(s, 'GET', '/apps/files_sharing/api/v1/shares').catch(() => []),
    ocs(s, 'GET', '/apps/files_sharing/api/v1/shares?shared_with_me=true').catch(() => []),
  ])
  const items = new Map()
  for (const [list, dir] of [[mine, 'by-me'], [withMe, 'with-me']]) {
    for (const sh of list || []) {
      if (Number(sh.share_type) !== 1 || sh.share_with !== FAMILY_GROUP) continue
      const item = { ...shareToItem(sh, dir), family: true, sharedWith: [{ userId: `group:${FAMILY_GROUP}`, permission: permissionFromOcs(sh.permissions) }] }
      items.set(item.id, item)
    }
  }
  send(res, 200, [...items.values()])
})

async function findShares(s, p) {
  const list = await ocs(s, 'GET', `/apps/files_sharing/api/v1/shares?path=${encodeURIComponent(p)}&reshares=false`).catch((e) => {
    if (e.status === 404) return []
    throw e
  })
  return list || []
}

function targetOf(userId) {
  const id = String(userId || '')
  if (id.startsWith('group:')) return { shareType: 1, shareWith: id.slice(6) }
  return { shareType: 0, shareWith: id }
}

route('POST', '/api/shares', async (req, res) => {
  const s = requireSession(req)
  const { path: p, userId, permission } = await readJson(req)
  const target = cleanPath(p, { allowRoot: false })
  const { shareType, shareWith } = targetOf(userId)
  if (!shareWith) throw new HttpError(400, 'Escolha com quem compartilhar.')
  const perms = permissionToOcs(permission === 'edit' ? 'edit' : 'view')
  const existing = (await findShares(s, target)).find((sh) => Number(sh.share_type) === shareType && sh.share_with === shareWith)
  if (existing) {
    await ocs(s, 'PUT', `/apps/files_sharing/api/v1/shares/${existing.id}`, { permissions: perms })
  } else {
    await ocs(s, 'POST', '/apps/files_sharing/api/v1/shares', { path: target, shareType, shareWith, permissions: perms })
  }
  send(res, 204)
})

route('DELETE', '/api/shares', async (req, res, url) => {
  const s = requireSession(req)
  const target = cleanPath(url.searchParams.get('path'), { allowRoot: false })
  const { shareType, shareWith } = targetOf(url.searchParams.get('userId'))
  const matches = (await findShares(s, target)).filter((sh) => Number(sh.share_type) === shareType && sh.share_with === shareWith)
  for (const sh of matches) await ocs(s, 'DELETE', `/apps/files_sharing/api/v1/shares/${sh.id}`)
  send(res, 204)
})

// ---- Atividade e notificações
route('GET', '/api/activity', async (req, res, url) => {
  const s = requireSession(req)
  const limit = Math.min(50, Number(url.searchParams.get('limit')) || 6)
  try {
    const data = await ocs(s, 'GET', `/apps/activity/api/v2/activity/all?limit=${limit}`)
    send(res, 200, (data || []).map(toActivity))
  } catch {
    send(res, 200, [])
  }
})

route('GET', '/api/notifications', async (req, res) => {
  const s = requireSession(req)
  try {
    const data = await ocs(s, 'GET', '/apps/notifications/api/v2/notifications')
    send(
      res,
      200,
      (data || []).map((n) => ({
        id: String(n.notification_id),
        title: n.subject || 'Aviso',
        body: n.message || '',
        at: n.datetime ? new Date(n.datetime).toISOString() : new Date().toISOString(),
        read: false,
        kind: n.app === 'files_sharing' ? 'share' : n.object_type === 'quota' ? 'storage' : 'system',
      })),
    )
  } catch {
    send(res, 200, [])
  }
})

route('DELETE', '/api/notifications', async (req, res) => {
  const s = requireSession(req)
  await ocs(s, 'DELETE', '/apps/notifications/api/v2/notifications').catch(() => {})
  send(res, 204)
})

// ---- Administração (somente grupo admin)
async function readProc(file) {
  try {
    return await readFile(file, 'utf8')
  } catch {
    return ''
  }
}

async function cpuPercent() {
  const sample = async () => {
    const line = (await readProc('/proc/stat')).split('\n')[0] || ''
    const n = line.trim().split(/\s+/).slice(1).map(Number)
    const idle = (n[3] || 0) + (n[4] || 0)
    return { idle, total: n.reduce((a, b) => a + (b || 0), 0) }
  }
  const a = await sample()
  await new Promise((r) => setTimeout(r, 300))
  const b = await sample()
  const dt = b.total - a.total
  return dt > 0 ? Math.round((1 - (b.idle - a.idle) / dt) * 100) : 0
}

async function cpuTemp() {
  try {
    const zones = (await readdir(THERMAL_DIR)).filter((z) => z.startsWith('thermal_zone'))
    const temps = await Promise.all(zones.map(async (z) => Number(await readProc(path.join(THERMAL_DIR, z, 'temp'))) / 1000))
    const valid = temps.filter((t) => t > 0 && t < 130)
    return valid.length ? Math.round(Math.max(...valid)) : undefined
  } catch {
    return undefined
  }
}

route('GET', '/api/admin/status', async (req, res) => {
  const s = requireSession(req)
  requireAdmin(s)
  const mem = Object.fromEntries(
    (await readProc('/proc/meminfo')).split('\n').map((l) => {
      const [k, v] = l.split(':')
      return [k, Number(String(v || '').trim().split(' ')[0]) * 1024]
    }),
  )
  const uptime = Number((await readProc('/proc/uptime')).split(' ')[0]) || os.uptime()
  const [cpu, temp, fsInfo] = await Promise.all([cpuPercent(), cpuTemp(), statfs(DATA_DIR).catch(() => null)])
  const total = fsInfo ? fsInfo.blocks * fsInfo.bsize : 0
  const free = fsInfo ? fsInfo.bavail * fsInfo.bsize : 0
  const used = total - free
  const ramTotal = mem.MemTotal || os.totalmem()
  const ramUsed = ramTotal - (mem.MemAvailable || os.freemem())
  const diskPct = total ? used / total : 0
  const health = diskPct > 0.95 || (temp ?? 0) > 85 ? 'critical' : diskPct > 0.85 || (temp ?? 0) > 75 || ramUsed / ramTotal > 0.92 ? 'warn' : 'ok'
  send(res, 200, {
    hostname: process.env.HOST_NAME || os.hostname(),
    uptimeSec: Math.round(uptime),
    cpuPercent: cpu,
    ramUsedBytes: ramUsed,
    ramTotalBytes: ramTotal,
    cpuTempC: temp,
    totalBytes: total,
    usedBytes: used,
    health,
    disks: total
      ? [{
          id: 'd-sistema',
          label: 'Disco do NAS',
          model: process.env.DISK_LABEL || 'Disco interno (sistema + dados)',
          sizeBytes: total,
          usedBytes: used,
          temperatureC: undefined,
          health: diskPct > 0.95 ? 'critical' : diskPct > 0.85 ? 'warn' : 'ok',
          smart: diskPct > 0.85 ? 'Pouco espaço livre' : 'Espaço ok (SMART não monitorado)',
        }]
      : [],
    backups: [],
  })
})

route('GET', '/api/admin/users', async (req, res) => {
  const s = requireSession(req)
  requireAdmin(s)
  const data = await ocs(s, 'GET', '/cloud/users/details?limit=200')
  const users = Object.values(data?.users || {}).filter((u) => u && u.id)
  send(res, 200, users.map((u) => toUser(u, ADMIN_GROUP)))
})

route('GET', '/api/health', async (req, res) => {
  let nextcloud = false
  try {
    const r = await fetch(`${NC}/status.php`)
    nextcloud = r.ok
  } catch {
    /* fora do ar */
  }
  send(res, 200, { ok: true, nextcloud })
})

// ───────────────────────────── Arquivos do site ─────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(self), geolocation=(), microphone=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
}

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname)
  if (rel.endsWith('/')) rel += 'index.html'
  let file = path.join(PUBLIC_DIR, path.normalize(rel))
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 400, { message: 'Caminho inválido.' })
  let info = await stat(file).catch(() => null)
  if (!info || !info.isFile()) {
    // rotas do app (ex.: /arquivos/...) → index.html
    if (path.extname(rel)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS })
      return res.end('Não encontrado')
    }
    file = path.join(PUBLIC_DIR, 'index.html')
    info = await stat(file).catch(() => null)
    if (!info) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end('Site não encontrado na pasta public/.')
    }
  }
  const ext = path.extname(file)
  const immutable = file.includes(`${path.sep}assets${path.sep}`)
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...SECURITY_HEADERS,
  })
  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}

// ───────────────────────────── Servidor ─────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  try {
    if (url.pathname.startsWith('/api/')) {
      // Proteção contra CSRF: pedidos que alteram algo precisam deste cabeçalho (sites de fora não conseguem enviá-lo)
      if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-requested-with'] !== 'HomeCloud') {
        throw new HttpError(403, 'Pedido bloqueado por segurança.')
      }
      const r = routes.find((x) => x.method === req.method && x.pattern === url.pathname)
      if (!r) throw new HttpError(404, 'Rota não encontrada.')
      await r.handler(req, res, url)
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Método não permitido.')
    await serveStatic(req, res, url)
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    if (status >= 500) log('erro', req.method, url.pathname, e.stack || e.message)
    if (!res.headersSent) send(res, status, { message: e instanceof HttpError ? e.message : 'Erro interno. Tente novamente.' })
    else res.destroy()
  }
})

// envios grandes podem demorar: sem limite de tempo para o corpo, mas com limite para os cabeçalhos
server.requestTimeout = 0
server.headersTimeout = 60_000
server.keepAliveTimeout = 30_000

await loadSessions()
server.listen(PORT, () => log(`HomeCloud ouvindo na porta ${PORT} — Nextcloud em ${NC}`))

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    clearTimeout(saveTimer)
    try {
      await mkdir(DATA_DIR, { recursive: true })
      await writeFile(SESSIONS_FILE, JSON.stringify(Object.fromEntries(sessions)), { mode: 0o600 })
    } catch {
      /* ok */
    }
    process.exit(0)
  })
}

export { server }
