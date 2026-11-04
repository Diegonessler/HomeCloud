import {
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderHeart,
  Image,
  Clapperboard,
  Music,
  Presentation,
  FileCode,
} from 'lucide-react'
import type { FileItem, FileKind } from '../types'
import { cn } from '../lib/cn'

const ICONS: Record<FileKind, typeof File> = {
  folder: Folder,
  image: Image,
  video: Clapperboard,
  audio: Music,
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  archive: FileArchive,
  text: FileCode,
  other: File,
}

// Cores por tipo: discretas, só no ícone e num fundo bem suave
export const KIND_COLOR: Record<FileKind, string> = {
  folder: '#6d8dff',
  image: '#a78bfa',
  video: '#f472b6',
  audio: '#22d3ee',
  pdf: '#f87171',
  doc: '#60a5fa',
  sheet: '#34d399',
  slides: '#fbbf24',
  archive: '#94a3b8',
  text: '#a5b4fc',
  other: '#94a3b8',
}

export function FileIcon({ item, size = 'md', className }: { item: Pick<FileItem, 'kind' | 'family'>; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const Icon = item.kind === 'folder' && item.family ? FolderHeart : ICONS[item.kind]
  const color = KIND_COLOR[item.kind]
  const box = { sm: 'size-9 rounded-xl', md: 'size-11 rounded-2xl', lg: 'size-14 rounded-2xl', xl: 'size-20 rounded-3xl' }[size]
  const icon = { sm: 'size-[18px]', md: 'size-5', lg: 'size-7', xl: 'size-9' }[size]
  return (
    <div
      className={cn('grid shrink-0 place-items-center', box, className)}
      style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
    >
      <Icon className={icon} strokeWidth={1.8} fill={item.kind === 'folder' ? 'currentColor' : 'none'} fillOpacity={item.kind === 'folder' ? 0.18 : 0} />
    </div>
  )
}
