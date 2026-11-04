// Conversão das respostas do Nextcloud (WebDAV/OCS) para o formato que a interface do HomeCloud usa.
// Funções puras — testadas em test/mapping.test.mjs.

import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: true,
  parseTagValue: false,
  isArray: (name) => ['response', 'propstat', 'share-type'].includes(name),
})

export const FILE_PROPS = `
    <d:resourcetype/>
    <d:getlastmodified/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getetag/>
    <oc:size/>
    <oc:favorite/>
    <oc:owner-id/>
    <oc:share-types/>
    <nc:has-preview/>`

export const MEDIA_PROPS = `${FILE_PROPS}
    <nc:metadata-photos-size/>
    <nc:metadata-photos-original_date_time/>`

export const TRASH_PROPS = `
    <d:resourcetype/>
    <d:getlastmodified/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <oc:size/>
    <nc:trashbin-filename/>
    <nc:trashbin-original-location/>
    <nc:trashbin-deletion-time/>`

const NS = 'xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns"'

export const propfindBody = (props = FILE_PROPS) => `<?xml version="1.0"?><d:propfind ${NS}><d:prop>${props}</d:prop></d:propfind>`

export const favoritesReportBody = () =>
  `<?xml version="1.0"?><oc:filter-files ${NS}><d:prop>${FILE_PROPS}</d:prop><oc:filter-rules><oc:favorite>1</oc:favorite></oc:filter-rules></oc:filter-files>`

export const proppatchFavoriteBody = (fav) =>
  `<?xml version="1.0"?><d:propertyupdate ${NS}><d:set><d:prop><oc:favorite>${fav ? 1 : 0}</oc:favorite></d:prop></d:set></d:propertyupdate>`

export function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])
}

/** Corpo de uma busca WebDAV (SEARCH) na pasta do usuário */
export function searchBody(uid, { where, orderBy = 'getlastmodified', descending = true, limit = 50, props = FILE_PROPS }) {
  return `<?xml version="1.0"?>
<d:searchrequest ${NS}>
  <d:basicsearch>
    <d:select><d:prop>${props}</d:prop></d:select>
    <d:from><d:scope><d:href>/files/${escapeXml(uid)}</d:href><d:depth>infinity</d:depth></d:scope></d:from>
    <d:where>${where}</d:where>
    <d:orderby><d:order><d:prop><d:${orderBy}/></d:prop>${descending ? '<d:descending/>' : '<d:ascending/>'}</d:order></d:orderby>
    <d:limit><d:nresults>${limit}</d:nresults></d:limit>
  </d:basicsearch>
</d:searchrequest>`
}

export const whereNameLike = (q) =>
  `<d:like><d:prop><d:displayname/></d:prop><d:literal>%${escapeXml(q.replace(/[%_]/g, ''))}%</d:literal></d:like>`
export const whereNotFolder = () => `<d:not><d:is-collection/></d:not>`
export const whereMedia = () =>
  `<d:or><d:like><d:prop><d:getcontenttype/></d:prop><d:literal>image/%</d:literal></d:like><d:like><d:prop><d:getcontenttype/></d:prop><d:literal>video/%</d:literal></d:like></d:or>`

/** Lê uma resposta multistatus e devolve [{ href, props }] só com propriedades 200 OK */
export function parseMultistatus(text) {
  let doc
  try {
    doc = parser.parse(text)
  } catch {
    return []
  }
  const ms = doc?.multistatus
  if (!ms) return []
  return (ms.response || []).map((r) => {
    const props = {}
    for (const ps of r.propstat || []) {
      if (/\s200\s/.test(` ${ps.status} `) && ps.prop && typeof ps.prop === 'object') Object.assign(props, ps.prop)
    }
    let href = String(r.href ?? '')
    try {
      href = decodeURIComponent(href)
    } catch {
      /* mantém como veio */
    }
    return { href, props }
  })
}

const KIND_BY_EXT = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', heic: 'image', heif: 'image', avif: 'image', svg: 'image',
  mp4: 'video', mov: 'video', mkv: 'video', webm: 'video', avi: 'video', m4v: 'video', '3gp': 'video',
  mp3: 'audio', wav: 'audio', m4a: 'audio', ogg: 'audio', flac: 'audio', opus: 'audio',
  pdf: 'pdf', doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc',
  xls: 'sheet', xlsx: 'sheet', ods: 'sheet', csv: 'sheet',
  ppt: 'slides', pptx: 'slides', odp: 'slides',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  txt: 'text', md: 'text', json: 'text', log: 'text',
}

export function kindFromName(name, mime = '') {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (KIND_BY_EXT[ext]) return KIND_BY_EXT[ext]
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'other'
}

export const parentOf = (p) => {
  if (!p || p === '/') return null
  const i = p.lastIndexOf('/')
  return i <= 0 ? null : p.slice(0, i)
}
export const baseName = (p) => p.replace(/\/$/, '').split('/').pop() || ''

/** Caminho relativo à pasta do usuário a partir do href do WebDAV */
export function relFromHref(uid, href) {
  const marker = `/remote.php/dav/files/${uid}`
  const i = href.indexOf(marker)
  const rest = i >= 0 ? href.slice(i + marker.length) : href
  return rest.replace(/\/$/, '') || '/'
}

const isFolderProps = (props) => typeof props.resourcetype === 'object' && props.resourcetype !== null && 'collection' in props.resourcetype

export function previewUrlFor(path, etag = '') {
  return `/api/preview?path=${encodeURIComponent(path)}&v=${encodeURIComponent(String(etag).replace(/"/g, ''))}`
}

/** Entrada WebDAV → FileItem */
export function toFileItem(uid, { href, props }, shares, familyGroup) {
  const path = relFromHref(uid, href)
  const folder = isFolderProps(props)
  const name = baseName(path)
  const kind = folder ? 'folder' : kindFromName(name, props.getcontenttype || '')
  const shareTypes = [].concat(props['share-types']?.['share-type'] ?? []).map(Number)
  const sh = shares?.get(path)
  const item = {
    id: path,
    name,
    kind,
    parentId: parentOf(path),
    size: Number(props.size || props.getcontentlength || 0),
    modifiedAt: props.getlastmodified ? new Date(props.getlastmodified).toISOString() : new Date().toISOString(),
    ownerId: props['owner-id'] || uid,
    favorite: String(props.favorite) === '1',
    sharedWith: sh?.targets ?? [],
    family: sh ? sh.groups.includes(familyGroup) : undefined,
  }
  if (!sh && shareTypes.length) item.shared = true
  if ((kind === 'image' || kind === 'video') && String(props['has-preview']) === 'true') {
    item.previewUrl = previewUrlFor(path, props.getetag)
  }
  return item
}

/** Entrada WebDAV → MediaItem (galeria) */
export function toMediaItem(uid, entry) {
  const f = toFileItem(uid, entry)
  const { props } = entry
  let width = 4000
  let height = 3000
  try {
    const size = typeof props['metadata-photos-size'] === 'string' ? JSON.parse(props['metadata-photos-size']) : null
    if (size?.width && size?.height) {
      width = Number(size.width)
      height = Number(size.height)
    }
  } catch {
    /* sem metadados */
  }
  const original = Number(props['metadata-photos-original_date_time'])
  return {
    id: f.id,
    name: f.name,
    type: f.kind === 'video' ? 'video' : 'photo',
    takenAt: original > 0 ? new Date(original * 1000).toISOString() : f.modifiedAt,
    size: f.size,
    width,
    height,
    favorite: f.favorite,
    ownerId: f.ownerId,
    seed: hashCode(f.id),
    previewUrl: f.previewUrl,
    downloadUrl: `/api/download?path=${encodeURIComponent(f.id)}&inline=1`,
  }
}

/** Entrada da lixeira → FileItem com trashedAt (id = nome interno na lixeira) */
export function toTrashItem({ href, props }) {
  const trashId = baseName(href)
  const folder = isFolderProps(props)
  const name = props['trashbin-filename'] || trashId
  const original = String(props['trashbin-original-location'] || name)
  const deleted = Number(props['trashbin-deletion-time'] || 0)
  return {
    id: trashId,
    name,
    kind: folder ? 'folder' : kindFromName(name, props.getcontenttype || ''),
    parentId: parentOf('/' + original.replace(/^\//, '')),
    size: Number(props.size || props.getcontentlength || 0),
    modifiedAt: props.getlastmodified ? new Date(props.getlastmodified).toISOString() : new Date().toISOString(),
    ownerId: '',
    favorite: false,
    sharedWith: [],
    trashedAt: new Date((deleted || Date.now() / 1000) * 1000).toISOString(),
    originalPath: '/' + original.replace(/^\//, ''),
  }
}

const COLORS = ['#5b8cff', '#c084fc', '#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#fb923c', '#a78bfa']
export function hashCode(s) {
  let h = 0
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}
export const colorFor = (id) => COLORS[hashCode(id) % COLORS.length]

/** Dados de usuário do OCS → User */
export function toUser(d, adminGroup = 'admin') {
  const q = d.quota || {}
  const used = Math.max(0, Number(q.used || 0))
  const quota = Number(q.quota)
  const total = quota > 0 ? quota : Number(q.total) > 0 ? Number(q.total) : used + Math.max(0, Number(q.free || 0))
  const lastLogin = Number(d.lastLogin || 0)
  const firstLogin = Number(d.firstLoginTimestamp || 0)
  return {
    id: d.id,
    name: d.displayname || d['display-name'] || d.id,
    email: d.email || '',
    role: (d.groups || []).includes(adminGroup) ? 'admin' : 'member',
    color: colorFor(d.id),
    quotaBytes: total,
    usedBytes: used,
    createdAt: new Date(firstLogin ? firstLogin * 1000 : lastLogin || Date.now()).toISOString(),
    lastSeenAt: lastLogin ? new Date(lastLogin).toISOString() : undefined,
  }
}

export const permissionFromOcs = (n) => (Number(n) & 2 ? 'edit' : 'view')
export const permissionToOcs = (p) => (p === 'edit' ? 1 | 2 | 4 | 8 : 1)

/** Lista de compartilhamentos feitos por mim → Map(caminho → { targets, groups, shares }) */
export function sharesByPath(list) {
  const map = new Map()
  for (const sh of list || []) {
    const key = sh.path
    const e = map.get(key) || { targets: [], groups: [], shares: [] }
    if (Number(sh.share_type) === 0) e.targets.push({ userId: sh.share_with, permission: permissionFromOcs(sh.permissions) })
    if (Number(sh.share_type) === 1) {
      e.targets.push({ userId: `group:${sh.share_with}`, permission: permissionFromOcs(sh.permissions) })
      e.groups.push(sh.share_with)
    }
    e.shares.push(sh)
    map.set(key, e)
  }
  return map
}

/** Atividade do app Activity → formato da interface */
export function toActivity(a) {
  const t = String(a.type || '')
  const type = t.includes('shar')
    ? 'share'
    : t === 'file_deleted'
      ? 'delete'
      : t === 'file_restored'
        ? 'restore'
        : t === 'file_changed'
          ? 'rename'
          : t === 'favorite'
            ? 'favorite'
            : 'upload'
  return {
    id: String(a.activity_id),
    type,
    userId: a.user || a.affecteduser || '',
    target: a.object_name || '',
    text: a.subject || '',
    at: a.datetime ? new Date(a.datetime).toISOString() : new Date().toISOString(),
  }
}
