// Implementação DEMONSTRATIVA da API.
// Tudo acontece apenas na memória do navegador: nada é enviado, alterado ou apagado no servidor.
// Recarregar a página restaura os dados fictícios originais.

import type { Api } from '../contracts'
import { ServiceError } from '../contracts'
import type { FileItem, MediaItem, ShareEntry, StorageSummary, User } from '../../types'
import { kindFromName } from '../../lib/fileKind'
import * as data from './data'

const SESSION_KEY = 'hc.demo.session'

const wait = (min = 220, max = 520) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
const clone = <T,>(v: T): T => structuredClone(v)

let currentUserId: string | null = readSession()
const files: FileItem[] = clone(data.files)
const sharedWithMe: FileItem[] = clone(data.sharedWithMe)
const media: MediaItem[] = clone(data.media)
const users: User[] = clone(data.users)
const notifications = clone(data.notifications)
const activities = clone(data.activities)

function readSession(): string | null {
  try {
    // Guarda apenas o id do usuário de demonstração — nenhuma senha ou token.
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}
function writeSession(id: string | null) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* sessão só em memória */
  }
}

function me(): User {
  const u = users.find((x) => x.id === currentUserId)
  if (!u) throw new ServiceError('Sua sessão expirou. Entre novamente.', 'unauthorized')
  return u
}

function findFile(id: string): FileItem {
  const f = files.find((x) => x.id === id) ?? sharedWithMe.find((x) => x.id === id) ?? data.familyFolders.find((x) => x.id === id)
  if (!f) throw new ServiceError('Arquivo não encontrado.', 'not_found')
  return f
}

function withCounts(list: FileItem[]): FileItem[] {
  return list.map((f) =>
    f.kind === 'folder' && f.childCount === undefined
      ? { ...f, childCount: files.filter((c) => c.parentId === f.id && !c.trashedAt).length }
      : f,
  )
}

function log(type: (typeof activities)[number]['type'], target: string) {
  activities.unshift({ id: `ac-${Date.now()}`, type, userId: me().id, target, at: new Date().toISOString() })
}

function fakeProgress(count: number, onProgress?: (i: number, pct: number) => void) {
  return (async () => {
    for (let i = 0; i < count; i++) {
      for (let p = 0; p <= 100; p += 20 + Math.round(Math.random() * 15)) {
        onProgress?.(i, Math.min(p, 100))
        await wait(60, 140)
      }
      onProgress?.(i, 100)
    }
  })()
}

export const mockApi: Api = {
  auth: {
    async login(email, password) {
      await wait(600, 900)
      const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!u || password !== data.DEMO_PASSWORD) {
        throw new ServiceError('E-mail ou senha incorretos. Confira e tente de novo.', 'invalid_credentials')
      }
      currentUserId = u.id
      writeSession(u.id)
      return clone(u)
    },
    async logout() {
      await wait(150, 250)
      currentUserId = null
      writeSession(null)
    },
    async currentUser() {
      await wait(100, 200)
      return currentUserId ? clone(users.find((u) => u.id === currentUserId) ?? null) : null
    },
    async requestPasswordReset(email) {
      await wait(700, 1000)
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new ServiceError('Digite um e-mail válido.', 'invalid_email')
    },
    async changePassword(current, next) {
      await wait(500, 800)
      if (current !== data.DEMO_PASSWORD) throw new ServiceError('A senha atual não confere.', 'invalid_password')
      if (next.length < 8) throw new ServiceError('A nova senha precisa ter pelo menos 8 caracteres.', 'weak_password')
    },
    async updateProfile(patch) {
      await wait()
      Object.assign(me(), patch)
      return clone(me())
    },
  },

  files: {
    async list(parentId) {
      await wait()
      const uid = me().id
      return withCounts(files.filter((f) => f.parentId === parentId && !f.trashedAt && (parentId !== null || f.ownerId === uid)))
    },
    async get(id) {
      await wait(80, 160)
      try {
        return clone(findFile(id))
      } catch {
        return undefined
      }
    },
    async path(id) {
      const out: FileItem[] = []
      let cur = id ? files.find((f) => f.id === id) : undefined
      while (cur) {
        out.unshift(cur)
        cur = cur.parentId ? files.find((f) => f.id === cur!.parentId) : undefined
      }
      return clone(out)
    },
    async search(query) {
      await wait(250, 450)
      const q = query.trim().toLocaleLowerCase('pt-BR')
      if (!q) return []
      const norm = (s: string) => s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '')
      return withCounts(files.filter((f) => !f.trashedAt && norm(f.name).includes(norm(q))))
    },
    async recent(limit = 6) {
      await wait()
      return clone(
        files
          .filter((f) => f.kind !== 'folder' && !f.trashedAt)
          .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
          .slice(0, limit),
      )
    },
    async favorites() {
      await wait()
      return withCounts(files.filter((f) => f.favorite && !f.trashedAt))
    },
    async trash() {
      await wait()
      return clone(files.filter((f) => f.trashedAt).sort((a, b) => b.trashedAt!.localeCompare(a.trashedAt!)))
    },
    async createFolder(parentId, name) {
      await wait()
      const clean = name.trim()
      if (!clean) throw new ServiceError('Dê um nome para a pasta.', 'invalid_name')
      if (files.some((f) => f.parentId === parentId && !f.trashedAt && f.name.toLowerCase() === clean.toLowerCase())) {
        throw new ServiceError('Já existe um item com esse nome aqui.', 'conflict')
      }
      const item: FileItem = {
        id: `f-${Date.now()}`, name: clean, kind: 'folder', parentId, size: 0, modifiedAt: new Date().toISOString(),
        ownerId: me().id, favorite: false, sharedWith: [], childCount: 0,
      }
      files.push(item)
      log('folder', `a pasta "${clean}"`)
      return clone(item)
    },
    async rename(id, name) {
      await wait()
      const clean = name.trim()
      if (!clean) throw new ServiceError('O nome não pode ficar vazio.', 'invalid_name')
      const f = findFile(id)
      f.name = clean
      f.modifiedAt = new Date().toISOString()
      log('rename', `"${clean}"`)
      return clone(f)
    },
    async toggleFavorite(id) {
      await wait(120, 220)
      const f = findFile(id)
      f.favorite = !f.favorite
      return clone(f)
    },
    async moveToTrash(id) {
      await wait()
      const f = findFile(id)
      f.trashedAt = new Date().toISOString()
      log('delete', `"${f.name}"`)
    },
    async restore(id) {
      await wait()
      const f = findFile(id)
      delete f.trashedAt
      log('restore', `"${f.name}"`)
    },
    async deleteForever(id) {
      await wait()
      const i = files.findIndex((f) => f.id === id)
      if (i >= 0) files.splice(i, 1)
    },
    async emptyTrash() {
      await wait(400, 700)
      for (let i = files.length - 1; i >= 0; i--) if (files[i].trashedAt) files.splice(i, 1)
    },
    async upload(parentId, list, onProgress) {
      await fakeProgress(list.length, onProgress)
      const created = list.map<FileItem>((file, i) => {
        const kind = kindFromName(file.name, file.type)
        return {
          id: `up-${Date.now()}-${i}`, name: file.name, kind, parentId, size: file.size,
          modifiedAt: new Date().toISOString(), ownerId: me().id, favorite: false, sharedWith: [],
          localPreviewUrl: kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : undefined,
        }
      })
      files.push(...created)
      me().usedBytes += list.reduce((s, f) => s + f.size, 0)
      log('upload', list.length === 1 ? `"${list[0].name}"` : `${list.length} arquivos`)
      return clone(created)
    },
    async downloadUrl(id) {
      const f = findFile(id)
      return f.localPreviewUrl ?? null
    },
    async storage(): Promise<StorageSummary> {
      await wait()
      const u = me()
      const photos = media.reduce((s, m) => s + (m.ownerId === u.id ? m.size : 0), 0)
      const used = u.usedBytes
      return {
        usedBytes: used,
        quotaBytes: u.quotaBytes,
        breakdown: [
          { label: 'Fotos e vídeos', bytes: Math.max(photos, used * 0.62), kind: 'photos' },
          { label: 'Documentos', bytes: used * 0.14, kind: 'doc' },
          { label: 'Projetos', bytes: used * 0.16, kind: 'archive' },
          { label: 'Outros', bytes: used * 0.08, kind: 'other' },
        ],
      }
    },
  },

  media: {
    async list() {
      await wait(300, 600)
      return clone(media.sort((a, b) => b.takenAt.localeCompare(a.takenAt)))
    },
    async toggleFavorite(id) {
      await wait(100, 200)
      const m = media.find((x) => x.id === id)
      if (!m) throw new ServiceError('Foto não encontrada.', 'not_found')
      m.favorite = !m.favorite
      return clone(m)
    },
    async upload(list, onProgress) {
      await fakeProgress(list.length, onProgress)
      const created = list.map<MediaItem>((file, i) => ({
        id: `mu-${Date.now()}-${i}`, name: file.name, type: file.type.startsWith('video') ? 'video' : 'photo',
        takenAt: new Date(file.lastModified || Date.now()).toISOString(), size: file.size, width: 4000, height: 3000,
        favorite: false, ownerId: me().id, seed: Math.round(Math.random() * 1000), localPreviewUrl: URL.createObjectURL(file),
      }))
      media.unshift(...created)
      log('upload', `${list.length} ${list.length === 1 ? 'item' : 'itens'} na galeria`)
      return clone(created)
    },
  },

  sharing: {
    async list(direction) {
      await wait()
      const uid = me().id
      if (direction === 'with-me') {
        return sharedWithMe.map<ShareEntry>((item) => ({ id: `s-${item.id}`, item: clone(item), ownerId: item.ownerId, targets: item.sharedWith, sharedAt: item.modifiedAt }))
      }
      return withCounts(files.filter((f) => f.ownerId === uid && f.sharedWith.length > 0 && !f.family && !f.trashedAt)).map((item) => ({
        id: `s-${item.id}`, item, ownerId: uid, targets: item.sharedWith, sharedAt: item.modifiedAt,
      }))
    },
    async familyFolders() {
      await wait()
      return withCounts(clone(data.familyFolders))
    },
    async share(itemId, userId, permission) {
      await wait()
      const f = findFile(itemId)
      const existing = f.sharedWith.find((s) => s.userId === userId)
      if (existing) existing.permission = permission
      else f.sharedWith.push({ userId, permission })
      const who = users.find((u) => u.id === userId)?.name ?? 'familiar'
      log('share', `"${f.name}" com ${who}`)
    },
    async unshare(itemId, userId) {
      await wait()
      const f = findFile(itemId)
      f.sharedWith = f.sharedWith.filter((s) => s.userId !== userId)
    },
  },

  people: {
    async family() {
      await wait(100, 200)
      return clone(users)
    },
  },

  activity: {
    async recent(limit = 6) {
      await wait()
      return clone(activities.slice(0, limit))
    },
    async notifications() {
      await wait(100, 200)
      return clone(notifications)
    },
    async markAllRead() {
      notifications.forEach((n) => (n.read = true))
    },
  },

  admin: {
    async serverStatus() {
      if (me().role !== 'admin') throw new ServiceError('Área restrita ao administrador.', 'forbidden')
      await wait(400, 700)
      const s = clone(data.serverStatus)
      s.usedBytes = users.reduce((sum, u) => sum + u.usedBytes, 0) + 38 * 1024 ** 3
      return s
    },
    async users() {
      if (me().role !== 'admin') throw new ServiceError('Área restrita ao administrador.', 'forbidden')
      await wait()
      return clone(users)
    },
  },
}
