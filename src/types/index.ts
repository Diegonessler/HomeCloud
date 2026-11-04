// Tipos de domínio do HomeCloud.
// Mantidos independentes do Nextcloud para que a interface não dependa do formato da API.

export type Role = 'admin' | 'member'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  /** Cor de destaque do avatar (quando não há foto) */
  color: string
  avatarUrl?: string
  /** Grupo inteiro (ex.: "Toda a família") usado como destino de compartilhamento */
  isGroup?: boolean
  quotaBytes: number
  usedBytes: number
  createdAt: string
  lastSeenAt?: string
}

export type FileKind =
  | 'folder'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'slides'
  | 'archive'
  | 'text'
  | 'other'

export interface FileItem {
  id: string
  name: string
  kind: FileKind
  /** id da pasta pai; null = raiz de "Meus arquivos" */
  parentId: string | null
  size: number
  modifiedAt: string
  ownerId: string
  favorite: boolean
  sharedWith: ShareTarget[]
  /** Número de itens dentro (apenas pastas) */
  childCount?: number
  /** Arquivo na lixeira */
  trashedAt?: string
  /** Gerado só no modo demonstração (arquivo enviado nesta sessão, nunca saiu do navegador) */
  localPreviewUrl?: string
  /** Pasta familiar visível a todos */
  family?: boolean
  /** Miniatura gerada pelo servidor (imagens e vídeos) */
  previewUrl?: string
  /** Compartilhado, mas sem detalhes de com quem */
  shared?: boolean
}

export type Permission = 'view' | 'edit'

export interface ShareTarget {
  userId: string
  permission: Permission
}

export interface MediaItem {
  id: string
  name: string
  type: 'photo' | 'video'
  takenAt: string
  size: number
  width: number
  height: number
  durationSec?: number
  favorite: boolean
  album?: string
  ownerId: string
  /** Semente para a miniatura ilustrativa do modo demonstração */
  seed: number
  localPreviewUrl?: string
  /** Miniatura do servidor; acrescente &x=1600&y=1600&a=1 para versão grande */
  previewUrl?: string
  /** Arquivo original para exibir/tocar (vídeos) */
  downloadUrl?: string
}

export type ShareDirection = 'with-me' | 'by-me'

export interface ShareEntry {
  id: string
  item: FileItem
  ownerId: string
  targets: ShareTarget[]
  sharedAt: string
}

export type ActivityType = 'upload' | 'share' | 'delete' | 'rename' | 'folder' | 'favorite' | 'restore' | 'login'

export interface Activity {
  id: string
  type: ActivityType
  userId: string
  target: string
  at: string
  /** Frase pronta vinda do servidor (ex.: "Você criou foto.jpg") */
  text?: string
}

export interface AppNotification {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  kind: 'share' | 'storage' | 'system'
}

export type HealthLevel = 'ok' | 'warn' | 'critical'

export interface DiskInfo {
  id: string
  label: string
  model: string
  sizeBytes: number
  usedBytes: number
  temperatureC?: number
  health: HealthLevel
  smart: string
}

export interface BackupInfo {
  id: string
  name: string
  lastRunAt: string
  status: 'success' | 'running' | 'failed'
  sizeBytes: number
  destination: string
  nextRunAt: string
}

export interface ServerStatus {
  hostname: string
  uptimeSec: number
  cpuPercent: number
  ramUsedBytes: number
  ramTotalBytes: number
  cpuTempC?: number
  totalBytes: number
  usedBytes: number
  health: HealthLevel
  disks: DiskInfo[]
  backups: BackupInfo[]
}

export interface StorageSummary {
  usedBytes: number
  quotaBytes: number
  breakdown: { label: string; bytes: number; kind: FileKind | 'photos' }[]
}

export type SortKey = 'name' | 'size' | 'date'
export type SortDir = 'asc' | 'desc'
export type ViewMode = 'grid' | 'list'
