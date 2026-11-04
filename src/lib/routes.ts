import type { FileItem } from '../types'
import { formatBytes } from './format'

/** Endereço da pasta no app. O id pode ser um caminho com "/" (servidor real), então é codificado. */
export const folderHref = (id: string | null | undefined) => (id ? `/arquivos/${encodeURIComponent(id)}` : '/arquivos')

/** Texto curto de tamanho/conteúdo de um item */
export function describeItem(item: Pick<FileItem, 'kind' | 'childCount' | 'size'>) {
  if (item.kind === 'folder') {
    if (item.childCount !== undefined) return `${item.childCount} ${item.childCount === 1 ? 'item' : 'itens'}`
    return item.size ? formatBytes(item.size) : 'Pasta'
  }
  return formatBytes(item.size)
}

/** Versão grande da miniatura do servidor */
export const largePreview = (previewUrl: string) => `${previewUrl}&x=1600&y=1600&a=1`

/** Endereço para tocar/exibir o arquivo original no navegador (servidor real) */
export const inlineFileUrl = (id: string) => `/api/download?path=${encodeURIComponent(id)}&inline=1`
