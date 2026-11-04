import { useState } from 'react'
import { api } from '../services'
import { useToast } from '../contexts/ToastContext'
import type { FileItem } from '../types'
import { errorMessage } from './useAsync'
import { IS_DEMO } from '../services/config'

/**
 * Ações de arquivo compartilhadas entre páginas (Meus arquivos, Favoritos, Início...).
 * Controla os diálogos (renomear, excluir, compartilhar) e mostra feedback ao usuário.
 */
export function useFileActions(onChange: () => void) {
  const toast = useToast()
  const [renaming, setRenaming] = useState<FileItem | null>(null)
  const [deleting, setDeleting] = useState<FileItem | null>(null)
  const [sharing, setSharing] = useState<FileItem | null>(null)
  const [busy, setBusy] = useState(false)

  async function toggleFavorite(item: FileItem) {
    try {
      const updated = await api.files.toggleFavorite(item.id)
      toast.success(updated.favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos', `"${item.name}"`)
      onChange()
    } catch (e) {
      toast.error('Não foi possível favoritar', errorMessage(e))
    }
  }

  async function confirmRename(name: string) {
    if (!renaming) return
    setBusy(true)
    try {
      await api.files.rename(renaming.id, name)
      toast.success('Nome alterado', `Agora se chama "${name.trim()}".`)
      setRenaming(null)
      onChange()
    } catch (e) {
      toast.error('Não foi possível renomear', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const item = deleting
    setBusy(true)
    try {
      await api.files.moveToTrash(item.id)
      setDeleting(null)
      onChange()
      toast.success('Movido para a lixeira', `Você pode recuperar "${item.name}" pela Lixeira.`, {
        label: 'Desfazer',
        onClick: async () => {
          await api.files.restore(item.id)
          onChange()
        },
      })
    } catch (e) {
      toast.error('Não foi possível excluir', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function download(item: FileItem) {
    if (item.kind === 'folder') {
      toast.info('Download de pastas', 'Abra a pasta e baixe os arquivos um por um, por enquanto.')
      return
    }
    const url = await api.files.downloadUrl(item.id).catch(() => null)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = item.name
      a.click()
      return
    }
    toast.info(
      IS_DEMO ? 'Download indisponível na demonstração' : 'Download indisponível',
      IS_DEMO ? 'Este arquivo é fictício. Quando o servidor estiver conectado, o download funcionará aqui.' : undefined,
    )
  }

  return {
    toggleFavorite,
    download,
    renaming, setRenaming, confirmRename,
    deleting, setDeleting, confirmDelete,
    sharing, setSharing,
    busy,
  }
}
