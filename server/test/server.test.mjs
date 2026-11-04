// Teste de ponta a ponta: sobe um "Nextcloud" falso e o servidor do HomeCloud apontando para ele.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const USER = 'diego'
const PASS = 'senha-certa'
const APP = 'app-token-123'
const files = new Map([['/Leia-me.txt', 'olá família']])
let fake, port, ncPort

const auth = (req) => Buffer.from(String(req.headers.authorization || '').replace('Basic ', ''), 'base64').toString()
const ocsJson = (res, data, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ocs: { meta: { status: 'ok', statuscode: status }, data } }))
}

function multistatus(paths) {
  return `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">${paths
    .map(
      (p) => `<d:response><d:href>/remote.php/dav/files/${USER}${p.split('/').map(encodeURIComponent).join('/')}</d:href><d:propstat><d:prop>
      ${p === '/' ? '<d:resourcetype><d:collection/></d:resourcetype>' : '<d:resourcetype/>'}
      <d:getlastmodified>Fri, 30 Oct 2026 16:00:00 GMT</d:getlastmodified>
      <d:getcontentlength>${files.get(p)?.length ?? 0}</d:getcontentlength><d:getcontenttype>text/plain</d:getcontenttype>
      <oc:favorite>0</oc:favorite><oc:owner-id>${USER}</oc:owner-id></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`,
    )
    .join('')}</d:multistatus>`
}

before(async () => {
  fake = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const [u, p] = auth(req).split(':')
    if (url.pathname === '/ocs/v2.php/core/getapppassword') {
      if (u === USER && p === PASS) return ocsJson(res, { apppassword: APP })
      res.writeHead(401)
      return res.end()
    }
    if (u !== USER || p !== APP) {
      res.writeHead(401)
      return res.end()
    }
    if (url.pathname === '/ocs/v2.php/cloud/user') return ocsJson(res, { id: USER })
    if (url.pathname === `/ocs/v2.php/cloud/users/${USER}`)
      return ocsJson(res, { id: USER, displayname: 'Diego', groups: ['Familia'], quota: { used: 100, free: 900, total: 1000, quota: -3 } })
    if (url.pathname.startsWith('/ocs/v2.php/apps/files_sharing/api/v1/shares')) return ocsJson(res, [])
    if (url.pathname.startsWith(`/remote.php/dav/files/${USER}`)) {
      const rel = decodeURIComponent(url.pathname.slice(`/remote.php/dav/files/${USER}`.length)) || '/'
      if (req.method === 'PROPFIND') {
        if (rel !== '/' && !files.has(rel)) {
          res.writeHead(404)
          return res.end()
        }
        res.writeHead(207, { 'Content-Type': 'application/xml' })
        return res.end(req.headers.depth === '0' ? multistatus([rel]) : multistatus(['/', ...files.keys()]))
      }
      if (req.method === 'PUT') {
        const chunks = []
        for await (const c of req) chunks.push(c)
        files.set(rel, Buffer.concat(chunks).toString())
        res.writeHead(201)
        return res.end()
      }
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(files.get(rel) || '') })
        return res.end(files.get(rel))
      }
    }
    res.writeHead(404)
    res.end()
  })
  await new Promise((r) => fake.listen(0, r))
  ncPort = fake.address().port

  const dir = await mkdtemp(path.join(tmpdir(), 'hc-'))
  await mkdir(path.join(dir, 'public'))
  await writeFile(path.join(dir, 'public', 'index.html'), '<!doctype html><title>HomeCloud</title>')
  process.env.NC_URL = `http://127.0.0.1:${ncPort}`
  process.env.PUBLIC_DIR = path.join(dir, 'public')
  process.env.DATA_DIR = path.join(dir, 'data')
  process.env.PORT = '0'
  const mod = await import('../server.mjs')
  await new Promise((r) => (mod.server.listening ? r() : mod.server.once('listening', r)))
  port = mod.server.address().port
  globalThis.__server = mod.server
})

after(() => {
  globalThis.__server?.close()
  fake?.close()
})

const api = (p, opts = {}) =>
  fetch(`http://127.0.0.1:${port}${p}`, { ...opts, headers: { 'X-Requested-With': 'HomeCloud', ...(opts.headers || {}) } })

let cookie = ''

test('senha errada é recusada com mensagem clara', async () => {
  const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: USER, password: 'x' }) })
  assert.equal(r.status, 401)
  assert.match((await r.json()).message, /incorretos/)
})

test('login cria sessão com cookie httpOnly e não devolve tokens', async () => {
  const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: USER, password: PASS }) })
  assert.equal(r.status, 200)
  const set = r.headers.get('set-cookie')
  assert.match(set, /HttpOnly/)
  assert.match(set, /SameSite=Strict/)
  cookie = set.split(';')[0]
  const body = await r.text()
  assert.ok(!body.includes(APP), 'a senha de app não pode ir para o navegador')
  assert.equal(JSON.parse(body).name, 'Diego')
})

test('sem cookie, a API exige login', async () => {
  const r = await api('/api/files')
  assert.equal(r.status, 401)
})

test('pedido sem cabeçalho anti-CSRF é bloqueado', async () => {
  const r = await fetch(`http://127.0.0.1:${port}/api/files/folder`, { method: 'POST', headers: { cookie } })
  assert.equal(r.status, 403)
})

test('lista arquivos, envia e baixa', async () => {
  let r = await api('/api/files', { headers: { cookie } })
  assert.equal(r.status, 200)
  let list = await r.json()
  assert.deepEqual(list.map((f) => f.name), ['Leia-me.txt'])

  r = await api('/api/upload?parent=%2F&name=nota.txt', { method: 'PUT', headers: { cookie }, body: 'conteúdo novo' })
  assert.equal(r.status, 201)
  assert.equal((await r.json()).id, '/nota.txt')

  // mesmo nome de novo → não sobrescreve, vira "nota (2).txt"
  r = await api('/api/upload?parent=%2F&name=nota.txt', { method: 'PUT', headers: { cookie }, body: 'outra versão' })
  assert.equal((await r.json()).id, '/nota (2).txt')

  r = await api('/api/download?path=%2Fnota.txt', { headers: { cookie } })
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-disposition'), /attachment/)
  assert.equal(await r.text(), 'conteúdo novo')
})

test('caminho com .. é recusado', async () => {
  const r = await api('/api/download?path=%2F..%2F..%2Fetc%2Fpasswd', { headers: { cookie } })
  assert.equal(r.status, 400)
})

test('site é servido com fallback para rotas do app', async () => {
  const r = await fetch(`http://127.0.0.1:${port}/arquivos/qualquer`)
  assert.equal(r.status, 200)
  assert.match(await r.text(), /HomeCloud/)
  assert.ok(r.headers.get('content-security-policy'))
})

test('logout apaga a sessão', async () => {
  const r = await api('/api/auth/logout', { method: 'POST', headers: { cookie } })
  assert.equal(r.status, 204)
  const again = await api('/api/auth/me', { headers: { cookie } })
  assert.equal(again.status, 401)
})
