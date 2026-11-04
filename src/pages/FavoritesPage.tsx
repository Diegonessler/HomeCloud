import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { api } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useFileActions } from '../hooks/useFileActions'
import { useUploads } from '../contexts/UploadContext'
import { FileCollection } from '../components/FileCollection'
import { FilePreview } from '../components/FilePreview'
import { ConfirmDialog, NameDialog, ShareDialog } from '../components/dialogs'
import { EmptyState } from '../components/ui/misc'
import { Button } from '../components/ui/Button'
import type { FileItem } from '../types'
import { sortItems } from '../lib/sort'
import { folderHref } from '../lib/routes'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { version } = useUploads()
  const list = useAsync(() => api.files.favorites(), [version])
  const actions = useFileActions(list.reload)
  const [preview, setPreview] = useState<FileItem | null>(null)
  const items = sortItems(list.data ?? [], 'name', 'asc')

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Favoritos</h1>
        <p className="mt-1 text-sm text-subtle">Atalhos para o que você mais usa. Toque na estrela de um arquivo para trazê-lo para cá.</p>
      </div>

      {!list.loading && items.length === 0 ? (
        <EmptyState
          icon={<Star className="size-7" />}
          title="Nenhum favorito ainda"
          body="Em Meus arquivos, toque em ⋮ e escolha “Favoritar” para guardar um atalho aqui."
          action={<Button variant="secondary" onClick={() => navigate('/arquivos')}>Ir para Meus arquivos</Button>}
        />
      ) : (
        <FileCollection
          items={items}
          view="grid"
          loading={list.loading}
          onOpen={(i) => (i.kind === 'folder' ? navigate(folderHref(i.id)) : setPreview(i))}
          onFavorite={actions.toggleFavorite}
          onShare={actions.setSharing}
          onRename={actions.setRenaming}
          onDownload={actions.download}
          onDelete={actions.setDeleting}
        />
      )}

      <FilePreview item={preview} onClose={() => setPreview(null)} onDownload={actions.download} onShare={(i) => (setPreview(null), actions.setSharing(i))} />
      <NameDialog open={!!actions.renaming} mode="rename" initial={actions.renaming?.name} onClose={() => actions.setRenaming(null)} onSubmit={actions.confirmRename} loading={actions.busy} />
      <ConfirmDialog
        open={!!actions.deleting}
        onClose={() => actions.setDeleting(null)}
        onConfirm={actions.confirmDelete}
        loading={actions.busy}
        danger
        title={`Mover “${actions.deleting?.name}” para a lixeira?`}
        body="Você poderá recuperar pela Lixeira enquanto ela não for esvaziada."
        confirmLabel="Mover para a lixeira"
      />
      <ShareDialog item={actions.sharing} onClose={() => actions.setSharing(null)} onChanged={list.reload} />
    </div>
  )
}
