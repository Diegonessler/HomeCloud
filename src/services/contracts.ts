// Contratos da camada de serviços.
// A interface (páginas/componentes) depende SOMENTE destes contratos.
// Hoje existem duas implementações:
//   - services/mock      → dados demonstrativos em memória (padrão)
//   - services/nextcloud → esqueleto para integração real (WebDAV + OCS via backend)

import type {
  Activity,
  AppNotification,
  FileItem,
  MediaItem,
  Permission,
  ServerStatus,
  ShareDirection,
  ShareEntry,
  StorageSummary,
  User,
} from '../types'

export interface AuthService {
  login(email: string, password: string): Promise<User>
  logout(): Promise<void>
  /** Restaura a sessão atual (ex.: cookie de sessão httpOnly no backend) */
  currentUser(): Promise<User | null>
  requestPasswordReset(email: string): Promise<void>
  changePassword(current: string, next: string): Promise<void>
  updateProfile(patch: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User>
}

export interface FilesService {
  list(parentId: string | null): Promise<FileItem[]>
  get(id: string): Promise<FileItem | undefined>
  /** Caminho de pastas da raiz até a pasta informada (para breadcrumbs) */
  path(id: string | null): Promise<FileItem[]>
  search(query: string): Promise<FileItem[]>
  recent(limit?: number): Promise<FileItem[]>
  favorites(): Promise<FileItem[]>
  trash(): Promise<FileItem[]>
  createFolder(parentId: string | null, name: string): Promise<FileItem>
  rename(id: string, name: string): Promise<FileItem>
  toggleFavorite(id: string): Promise<FileItem>
  moveToTrash(id: string): Promise<void>
  restore(id: string): Promise<void>
  deleteForever(id: string): Promise<void>
  emptyTrash(): Promise<void>
  upload(parentId: string | null, files: File[], onProgress?: (fileIndex: number, pct: number) => void): Promise<FileItem[]>
  /** URL para baixar. No modo demo retorna null (não há arquivo real no servidor). */
  downloadUrl(id: string): Promise<string | null>
  storage(): Promise<StorageSummary>
}

export interface MediaService {
  list(): Promise<MediaItem[]>
  toggleFavorite(id: string): Promise<MediaItem>
  upload(files: File[], onProgress?: (fileIndex: number, pct: number) => void): Promise<MediaItem[]>
}

export interface SharingService {
  list(direction: ShareDirection): Promise<ShareEntry[]>
  familyFolders(): Promise<FileItem[]>
  share(itemId: string, userId: string, permission: Permission): Promise<void>
  unshare(itemId: string, userId: string): Promise<void>
}

export interface PeopleService {
  family(): Promise<User[]>
}

export interface ActivityService {
  recent(limit?: number): Promise<Activity[]>
  notifications(): Promise<AppNotification[]>
  markAllRead(): Promise<void>
}

export interface AdminService {
  serverStatus(): Promise<ServerStatus>
  users(): Promise<User[]>
}

export interface Api {
  auth: AuthService
  files: FilesService
  media: MediaService
  sharing: SharingService
  people: PeopleService
  activity: ActivityService
  admin: AdminService
}

/** Erro amigável para exibir ao usuário */
export class ServiceError extends Error {
  readonly code: string
  constructor(message: string, code = 'error') {
    super(message)
    this.code = code
  }
}
