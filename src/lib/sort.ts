import type { FileItem, SortDir, SortKey } from '../types'

/** Ordena itens mantendo pastas sempre antes dos arquivos. */
export function sortItems(items: FileItem[], key: SortKey, dir: SortDir) {
  const mul = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    // pastas sempre primeiro
    if ((a.kind === 'folder') !== (b.kind === 'folder')) return a.kind === 'folder' ? -1 : 1
    if (key === 'name') return a.name.localeCompare(b.name, 'pt-BR', { numeric: true }) * mul
    if (key === 'size') return (a.size - b.size) * mul
    return a.modifiedAt.localeCompare(b.modifiedAt) * mul
  })
}
