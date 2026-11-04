import type { FileKind } from '../types'

const MAP: Record<string, FileKind> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', heic: 'image', avif: 'image', svg: 'image',
  mp4: 'video', mov: 'video', mkv: 'video', webm: 'video', avi: 'video', m4v: 'video',
  mp3: 'audio', wav: 'audio', m4a: 'audio', ogg: 'audio', flac: 'audio',
  pdf: 'pdf',
  doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc',
  xls: 'sheet', xlsx: 'sheet', ods: 'sheet', csv: 'sheet',
  ppt: 'slides', pptx: 'slides', odp: 'slides',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  txt: 'text', md: 'text', json: 'text', log: 'text',
}

export function kindFromName(name: string, mime?: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (MAP[ext]) return MAP[ext]
  if (mime?.startsWith('image/')) return 'image'
  if (mime?.startsWith('video/')) return 'video'
  if (mime?.startsWith('audio/')) return 'audio'
  return 'other'
}

export const KIND_LABEL: Record<FileKind, string> = {
  folder: 'Pasta',
  image: 'Imagem',
  video: 'Vídeo',
  audio: 'Áudio',
  pdf: 'PDF',
  doc: 'Documento',
  sheet: 'Planilha',
  slides: 'Apresentação',
  archive: 'Arquivo compactado',
  text: 'Texto',
  other: 'Arquivo',
}
