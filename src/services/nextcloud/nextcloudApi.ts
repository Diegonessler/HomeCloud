// Implementação REAL da API: conversa com o backend do HomeCloud (pasta server/),
// que por sua vez fala com o Nextcloud via WebDAV/OCS.
// Ativada com VITE_DATA_MODE=nextcloud no build.

import type { Api } from '../contracts'
import type { Activity, AppNotification, FileItem, MediaItem, ServerStatus, ShareEntry, StorageSummary, User } from '../../types'
import { http, uploadWithProgress } from './http'

const q = (params: Record<string, string | number | null | undefined>) => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

let photosFolder: string | null = null

export const nextcloudApi: Api = {
  auth: {
    login: (email, password) => http<User>('/auth/login', { method: 'POST', body: { email, password } }),
    logout: () => http('/auth/logout', { method: 'POST' }),
    currentUser: () => http<User>('/auth/me').catch(() => null),
    requestPasswordReset: (email) => http('/auth/forgot', { method: 'POST', body: { email } }),
    changePassword: (current, next) => http('/auth/password', { method: 'POST', body: { current, next } }),
    updateProfile: (patch) => http<User>('/auth/me', { method: 'PATCH', body: patch }),
  },

  files: {
    list: (parentId) => http<FileItem[]>(`/files${q({ parent: parentId })}`),
    get: (id) => http<FileItem>(`/files/item${q({ path: id })}`).catch(() => undefined),
    async path(id) {
      // O id é o próprio caminho ("/Documentos/Notas"), então os "breadcrumbs" saem dele
      if (!id) return []
      const parts = id.split('/').filter(Boolean)
      return parts.map<FileItem>((name, i) => ({
        id: '/' + parts.slice(0, i + 1).join('/'),
        name,
        kind: 'folder',
        parentId: i ? '/' + parts.slice(0, i).join('/') : null,
        size: 0,
        modifiedAt: new Date().toISOString(),
        ownerId: '',
        favorite: false,
        sharedWith: [],
      }))
    },
    search: (query) => http<FileItem[]>(`/files/search${q({ q: query })}`),
    recent: (limit = 6) => http<FileItem[]>(`/files/recent${q({ limit })}`),
    favorites: () => http<FileItem[]>('/files/favorites'),
    trash: () => http<FileItem[]>('/trash'),
    createFolder: (parentId, name) => http<FileItem>('/files/folder', { method: 'POST', body: { parent: parentId ?? '/', name } }),
    rename: (id, name) => http<FileItem>('/files/rename', { method: 'POST', body: { path: id, name } }),
    async toggleFavorite(id) {
      const current = await http<FileItem>(`/files/item${q({ path: id })}`)
      return http<FileItem>('/files/favorite', { method: 'POST', body: { path: id, favorite: !current.favorite } })
    },
    moveToTrash: (id) => http(`/files${q({ path: id })}`, { method: 'DELETE' }),
    restore: (id) => http('/trash/restore', { method: 'POST', body: { id } }),
    deleteForever: (id) => http(`/trash${q({ id })}`, { method: 'DELETE' }),
    emptyTrash: () => http('/trash', { method: 'DELETE' }),
    async upload(parentId, files, onProgress) {
      const out: FileItem[] = []
      for (const [i, file] of files.entries()) {
        const item = await uploadWithProgress<FileItem>(
          `/upload${q({ parent: parentId ?? '/', name: file.name, mtime: file.lastModified })}`,
          file,
          (p) => onProgress?.(i, p),
        )
        onProgress?.(i, 100)
        out.push(item)
      }
      return out
    },
    downloadUrl: async (id) => `/api/download${q({ path: id })}`,
    storage: () => http<StorageSummary>('/storage'),
  },

  media: {
    list: () => http<MediaItem[]>('/media'),
    async toggleFavorite(id) {
      const list = await http<MediaItem[]>('/media')
      const current = list.find((m) => m.id === id)
      return http<MediaItem>('/media/favorite', { method: 'POST', body: { path: id, favorite: !current?.favorite } })
    },
    async upload(files, onProgress) {
      photosFolder ??= (await http<{ path: string }>('/media/folder')).path
      for (const [i, file] of files.entries()) {
        await uploadWithProgress(
          `/upload${q({ parent: photosFolder, name: file.name, mtime: file.lastModified, mkdir: 1 })}`,
          file,
          (p) => onProgress?.(i, p),
        )
        onProgress?.(i, 100)
      }
      const all = await http<MediaItem[]>('/media')
      const names = new Set(files.map((f) => f.name))
      return all.filter((m) => m.id.startsWith(photosFolder + '/') && names.has(m.name))
    },
  },

  sharing: {
    list: (direction) => http<ShareEntry[]>(`/shares${q({ direction })}`),
    familyFolders: () => http<FileItem[]>('/shares/family'),
    share: (itemId, userId, permission) => http('/shares', { method: 'POST', body: { path: itemId, userId, permission } }),
    unshare: (itemId, userId) => http(`/shares${q({ path: itemId, userId })}`, { method: 'DELETE' }),
  },

  people: { family: () => http<User[]>('/family') },

  activity: {
    recent: (limit = 6) => http<Activity[]>(`/activity${q({ limit })}`),
    notifications: () => http<AppNotification[]>('/notifications'),
    markAllRead: () => http('/notifications', { method: 'DELETE' }),
  },

  admin: {
    serverStatus: () => http<ServerStatus>('/admin/status'),
    users: () => http<User[]>('/admin/users'),
  },
}
