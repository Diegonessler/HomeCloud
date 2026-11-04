import type { ReactNode } from 'react'
import { Download, Share2, Star, Calendar, HardDrive, UserRound, FileType2 } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { AvatarStack } from './ui/misc'
import { FileIcon } from './FileIcon'
import { SceneArt } from './PhotoThumb'
import { DemoTag } from './DemoBanner'
import type { FileItem } from '../types'
import { useFamily } from '../hooks/useFamily'
import { formatBytes, formatDateTime } from '../lib/format'
import { KIND_LABEL } from '../lib/fileKind'
import { IS_DEMO } from '../services/config'
import { SafeImage } from './SafeImage'
import { inlineFileUrl, largePreview } from '../lib/routes'

/** Detalhes e prévia de um arquivo (abre ao tocar num arquivo). */
export function FilePreview({
  item,
  onClose,
  onDownload,
  onShare,
  onFavorite,
}: {
  item: FileItem | null
  onClose: () => void
  onDownload: (i: FileItem) => void
  onShare?: (i: FileItem) => void
  onFavorite?: (i: FileItem) => void
}) {
  const { byId } = useFamily()
  if (!item) return null
  const owner = byId(item.ownerId)
  const shared = item.sharedWith.map((s) => byId(s.userId)).filter((u): u is NonNullable<typeof u> => !!u)
  const visual = item.kind === 'image' || item.kind === 'video'

  return (
    <Modal open={!!item} onClose={onClose} size="lg" title={item.name}>
      <div className="relative -mx-1 mb-5 overflow-hidden rounded-2xl border border-line bg-surface-2">
        {item.localPreviewUrl && item.kind === 'image' && <img src={item.localPreviewUrl} alt={item.name} className="max-h-[50vh] w-full object-contain" />}
        {item.localPreviewUrl && item.kind === 'video' && <video src={item.localPreviewUrl} controls className="max-h-[50vh] w-full bg-black" />}
        {!item.localPreviewUrl && !IS_DEMO && item.kind === 'video' && (
          <video src={inlineFileUrl(item.id)} poster={item.previewUrl ? largePreview(item.previewUrl) : undefined} controls preload="metadata" className="max-h-[55vh] w-full bg-black" />
        )}
        {!item.localPreviewUrl && !IS_DEMO && item.kind === 'image' && (
          <SafeImage
            src={item.previewUrl ? largePreview(item.previewUrl) : inlineFileUrl(item.id)}
            alt={item.name}
            loading="eager"
            className="max-h-[55vh] w-full object-contain"
            fallback={
              <div className="grid place-items-center py-12">
                <FileIcon item={item} size="xl" />
              </div>
            }
          />
        )}
        {!item.localPreviewUrl && IS_DEMO && visual && (
          <div className="relative aspect-video">
            <SceneArt seed={item.name.length * 7} className="size-full" />
            <p className="absolute right-3 bottom-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {IS_DEMO ? 'Prévia ilustrativa — arquivo fictício' : 'Prévia indisponível'}
            </p>
          </div>
        )}
        {!visual && (
          <div className="grid place-items-center py-12">
            <FileIcon item={item} size="xl" />
            {IS_DEMO && <p className="mt-4 text-sm text-subtle">A visualização do conteúdo ficará disponível com o servidor conectado.</p>}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Detail icon={<FileType2 className="size-4" />} label="Tipo" value={KIND_LABEL[item.kind]} />
        <Detail icon={<HardDrive className="size-4" />} label="Tamanho" value={formatBytes(item.size)} />
        <Detail icon={<Calendar className="size-4" />} label="Modificado" value={formatDateTime(item.modifiedAt)} />
        <Detail icon={<UserRound className="size-4" />} label="Dono" value={owner?.name ?? '—'} />
      </dl>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-line p-3">
        <p className="text-sm text-muted">{shared.length ? `Compartilhado com ${shared.length} ${shared.length === 1 ? 'pessoa' : 'pessoas'}` : 'Só você tem acesso'}</p>
        {shared.length > 0 && <AvatarStack users={shared} />}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <DemoTag />
        <div className="ml-auto flex flex-wrap gap-2">
          {onFavorite && (
            <Button variant="secondary" icon={<Star className={item.favorite ? 'size-4 fill-warn text-warn' : 'size-4'} />} onClick={() => onFavorite(item)}>
              {item.favorite ? 'Favorito' : 'Favoritar'}
            </Button>
          )}
          {onShare && (
            <Button variant="secondary" icon={<Share2 className="size-4" />} onClick={() => onShare(item)}>
              Compartilhar
            </Button>
          )}
          <Button icon={<Download className="size-4" />} onClick={() => onDownload(item)}>
            Baixar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
      <span className="text-subtle">{icon}</span>
      <div>
        <dt className="text-xs text-subtle">{label}</dt>
        <dd className="font-medium text-fg">{value}</dd>
      </div>
    </div>
  )
}
