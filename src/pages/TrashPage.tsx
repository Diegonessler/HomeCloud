import { useState } from 'react'
import { Trash2, RotateCcw, Info, XCircle } from 'lucide-react'
import { api } from '../services'
import { useAsync, errorMessage } from '../hooks/useAsync'
import { useToast } from '../contexts/ToastContext'
import { FileIcon } from '../components/FileIcon'
import { ConfirmDialog } from '../components/dialogs'
import { EmptyState, Skeleton } from '../components/ui/misc'
import { Button } from '../components/ui/Button'
import type { FileItem } from '../types'
import { formatBytes, timeAgo } from '../lib/format'

const RETENTION_DAYS = 30

export default function TrashPage() {
  const toast = useToast()
  const list = useAsync(() => api.files.trash(), [])
  const [forever, setForever] = useState<FileItem | null>(null)
  const [emptying, setEmptying] = useState(false)
  const [busy, setBusy] = useState(false)
  const items = list.data ?? []
  const total = items.reduce((s, f) => s + f.size, 0)

  async function restore(item: FileItem) {
    try {
      await api.files.restore(item.id)
      toast.success('Arquivo recuperado', `"${item.name}" voltou para o lugar de origem.`)
      list.reload()
    } catch (e) {
      toast.error('Não foi possível recuperar', errorMessage(e))
    }
  }

  async function confirmForever() {
    if (!forever) return
    setBusy(true)
    try {
      await api.files.deleteForever(forever.id)
      toast.success('Excluído para sempre', `"${forever.name}" foi apagado definitivamente.`)
      setForever(null)
      list.reload()
    } catch (e) {
      toast.error('Não foi possível excluir', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirmEmpty() {
    setBusy(true)
    try {
      await api.files.emptyTrash()
      toast.success('Lixeira esvaziada', `${formatBytes(total)} liberados.`)
      setEmptying(false)
      list.reload()
    } catch (e) {
      toast.error('Não foi possível esvaziar', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const daysLeft = (iso: string) => Math.max(0, RETENTION_DAYS - Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Lixeira</h1>
          <p className="mt-1 text-sm text-subtle">{items.length ? `${items.length} itens · ${formatBytes(total)}` : 'Arquivos apagados ficam aqui por um tempo.'}</p>
        </div>
        {items.length > 0 && (
          <Button variant="secondary" className="text-danger" icon={<Trash2 className="size-4" />} onClick={() => setEmptying(true)}>
            Esvaziar lixeira
          </Button>
        )}
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-line bg-surface-2/60 p-4 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" />
        Itens na lixeira são apagados automaticamente depois de {RETENTION_DAYS} dias. Até lá, você pode recuperá-los com um toque.
      </div>

      {list.loading ? (
        <div className="card divide-y divide-line">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="size-9" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Trash2 className="size-7" />} title="A lixeira está vazia" body="Nada para recuperar por aqui. Tudo certo!" />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 p-3.5 sm:flex-nowrap sm:px-4">
              <FileIcon item={f} size="sm" className="opacity-70" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{f.name}</p>
                <p className="text-xs text-subtle">
                  Apagado {timeAgo(f.trashedAt!)} · {formatBytes(f.size)} · <span className="text-warn">some em {daysLeft(f.trashedAt!)} dias</span>
                </p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button size="sm" variant="soft" icon={<RotateCcw className="size-4" />} onClick={() => restore(f)} className="flex-1 sm:flex-none">
                  Recuperar
                </Button>
                <Button size="sm" variant="ghost" className="hover:text-danger" icon={<XCircle className="size-4" />} onClick={() => setForever(f)} aria-label={`Excluir ${f.name} para sempre`}>
                  <span className="sm:sr-only">Excluir</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!forever}
        onClose={() => setForever(null)}
        onConfirm={confirmForever}
        loading={busy}
        danger
        title="Excluir para sempre?"
        body={`“${forever?.name}” será apagado definitivamente e não poderá ser recuperado.`}
        confirmLabel="Excluir para sempre"
      />
      <ConfirmDialog
        open={emptying}
        onClose={() => setEmptying(false)}
        onConfirm={confirmEmpty}
        loading={busy}
        danger
        title="Esvaziar a lixeira?"
        body={`Os ${items.length} itens serão apagados para sempre e não poderão ser recuperados.`}
        confirmLabel="Esvaziar lixeira"
      />
    </div>
  )
}
