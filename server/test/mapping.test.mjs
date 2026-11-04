import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMultistatus, toFileItem, toTrashItem, toMediaItem, toUser, sharesByPath, relFromHref, parentOf, searchBody, whereNameLike } from '../lib/mapping.mjs'

const PROPFIND = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
 <d:response>
  <d:href>/remote.php/dav/files/diego/</d:href>
  <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype><oc:size>123</oc:size></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
 </d:response>
 <d:response>
  <d:href>/remote.php/dav/files/diego/Documentos%20da%20casa/</d:href>
  <d:propstat>
   <d:prop>
    <d:resourcetype><d:collection/></d:resourcetype>
    <d:getlastmodified>Fri, 30 Oct 2026 16:00:00 GMT</d:getlastmodified>
    <d:getetag>"abc"</d:getetag>
    <oc:size>2048</oc:size>
    <oc:favorite>1</oc:favorite>
    <oc:owner-id>diego</oc:owner-id>
    <oc:share-types><oc:share-type>1</oc:share-type></oc:share-types>
   </d:prop>
   <d:status>HTTP/1.1 200 OK</d:status>
  </d:propstat>
  <d:propstat><d:prop><d:getcontentlength/><d:getcontenttype/></d:prop><d:status>HTTP/1.1 404 Not Found</d:status></d:propstat>
 </d:response>
 <d:response>
  <d:href>/remote.php/dav/files/diego/Foto%20praia.jpg</d:href>
  <d:propstat>
   <d:prop>
    <d:resourcetype/>
    <d:getlastmodified>Thu, 29 Oct 2026 10:00:00 GMT</d:getlastmodified>
    <d:getcontentlength>3145728</d:getcontentlength>
    <d:getcontenttype>image/jpeg</d:getcontenttype>
    <d:getetag>"e1"</d:getetag>
    <oc:size>3145728</oc:size>
    <oc:favorite>0</oc:favorite>
    <oc:owner-id>diego</oc:owner-id>
    <oc:share-types/>
    <nc:has-preview>true</nc:has-preview>
    <nc:metadata-photos-size>{"width":3024,"height":4032}</nc:metadata-photos-size>
   </d:prop>
   <d:status>HTTP/1.1 200 OK</d:status>
  </d:propstat>
 </d:response>
</d:multistatus>`

test('parseMultistatus lê respostas e ignora props 404', () => {
  const entries = parseMultistatus(PROPFIND)
  assert.equal(entries.length, 3)
  assert.equal(entries[1].href, '/remote.php/dav/files/diego/Documentos da casa/')
  assert.equal(entries[1].props.getcontentlength, undefined)
})

test('toFileItem monta pastas e arquivos', () => {
  const [, folder, photo] = parseMultistatus(PROPFIND)
  const shares = sharesByPath([{ path: '/Documentos da casa', share_type: 1, share_with: 'Familia', permissions: 31 }])
  const f = toFileItem('diego', folder, shares, 'Familia')
  assert.equal(f.id, '/Documentos da casa')
  assert.equal(f.kind, 'folder')
  assert.equal(f.parentId, null)
  assert.equal(f.size, 2048)
  assert.equal(f.favorite, true)
  assert.equal(f.family, true)
  assert.deepEqual(f.sharedWith, [{ userId: 'group:Familia', permission: 'edit' }])

  const p = toFileItem('diego', photo, new Map(), 'Familia')
  assert.equal(p.kind, 'image')
  assert.equal(p.name, 'Foto praia.jpg')
  assert.match(p.previewUrl, /^\/api\/preview\?path=%2FFoto%20praia\.jpg&v=e1$/)
})

test('toMediaItem usa metadados de tamanho', () => {
  const [, , photo] = parseMultistatus(PROPFIND)
  const m = toMediaItem('diego', photo)
  assert.equal(m.type, 'photo')
  assert.equal(m.width, 3024)
  assert.equal(m.height, 4032)
  assert.ok(m.downloadUrl.includes('inline=1'))
})

test('relFromHref e parentOf', () => {
  assert.equal(relFromHref('diego', '/remote.php/dav/files/diego/'), '/')
  assert.equal(relFromHref('diego', '/remote.php/dav/files/diego/a/b.txt'), '/a/b.txt')
  assert.equal(parentOf('/a/b.txt'), '/a')
  assert.equal(parentOf('/a'), null)
})

test('toTrashItem', () => {
  const [e] = parseMultistatus(`<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
 <d:response><d:href>/remote.php/dav/trashbin/diego/trash/nota.txt.d1761840000</d:href>
  <d:propstat><d:prop><d:resourcetype/><d:getcontentlength>12</d:getcontentlength><nc:trashbin-filename>nota.txt</nc:trashbin-filename>
  <nc:trashbin-original-location>Docs/nota.txt</nc:trashbin-original-location><nc:trashbin-deletion-time>1761840000</nc:trashbin-deletion-time></d:prop>
  <d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
</d:multistatus>`)
  const t = toTrashItem(e)
  assert.equal(t.id, 'nota.txt.d1761840000')
  assert.equal(t.name, 'nota.txt')
  assert.equal(t.originalPath, '/Docs/nota.txt')
  assert.equal(t.parentId, '/Docs')
  assert.equal(t.size, 12)
})

test('toUser com cota ilimitada usa espaço livre', () => {
  const u = toUser({ id: 'diego', displayname: 'Diego', groups: ['Familia'], quota: { free: 1000, used: 200, total: 1200, quota: -3 }, lastLogin: 1761840000000 })
  assert.equal(u.role, 'member')
  assert.equal(u.quotaBytes, 1200)
  assert.equal(u.usedBytes, 200)
  const a = toUser({ id: 'diego_admin', groups: ['admin'], quota: { used: 0, quota: 5000 } })
  assert.equal(a.role, 'admin')
  assert.equal(a.quotaBytes, 5000)
})

test('busca escapa caracteres especiais', () => {
  const body = searchBody('diego', { where: whereNameLike('<foto>&%') })
  assert.ok(body.includes('%&lt;foto&gt;&amp;%'))
  assert.ok(body.includes('<d:href>/files/diego</d:href>'))
})
