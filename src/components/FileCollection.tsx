import { Download, MoreVertical, Pencil, Share2, Star, Trash2, Users } from 'lucide-react'
import type { FileItem, ViewMode } from '../types'
import { FileIcon } from './FileIcon'
import { Menu, type MenuItem } from './ui/Menu'
import { Avatar, AvatarStack, Skeleton } from './ui/misc'
import { SceneArt } from './PhotoThumb'
import { useFamily } from '../hooks/useFamily'
import { timeAgo } from '../lib/format'
import { KIND_LABEL } from '../lib/fileKind'
import { cn } from '../lib/cn'
import { describeItem } from '../lib/routes'
import { SafeImage } from './SafeImage'
import { IS_DEMO } from '../services/config'

export interface FileHandlers {
  onOpen: (item: FileItem) => void
  onFavorite?: (item: FileItem) => void
  onShare?: (item: FileItem) => void
  onRename?: (item: FileItem) => void
  onDownload?: (item: FileItem) => void
  onDelete?: (item: FileItem) => void
}

interface Props extends FileHandlers {
  items: FileItem[]
  view: ViewMode
  loading?: boolean
  showOwner?: boolean
}

function actions(item: FileItem, h: FileHandlers): MenuItem[] {
  return [
    { label: item.favorite ? 'Tirar dos favoritos' : 'Favoritar', icon: <Star />, onSelect: () => h.onFavorite?.(item), hidden: !h.onFavorite },
    { label: 'Compartilhar', icon: <Share2 />, onSelect: () => h.onShare?.(item), hidden: !h.onShare },
    { label: 'Baixar', icon: <Download />, onSelect: () => h.onDownload?.(item), hidden: !h.onDownload },
    { label: 'Renomear', icon: <Pencil />, onSelect: () => h.onRename?.(item), hidden: !h.onRename },
    { label: 'Mover para a lixeira', icon: <Trash2 />, onSelect: () => h.onDelete?.(item), danger: true, hidden: !h.onDelete },
  ]
}

function ActionsButton({ item, h, className }: { item: FileItem; h: FileHandlers; className?: string }) {
  const list = actions(item, h).filter((a) => !a.hidden)
  if (!list.length) return null
  return (
    <Menu
      label={`Ações para ${item.name}`}
      items={list}
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          className={cn('rounded-xl p-2 text-subtle transition hover:bg-surface-3 hover:text-fg', open && 'bg-surface-3 text-fg', className)}
          aria-label={`Mais opções para ${item.name}`}
        >
          <MoreVertical className="size-[18px]" />
        </button>
      )}
    />
  )
}

function seedFrom(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

const describe = describeItem

export function FileCollection({ items, view, loading, showOwner, ...h }: Props) {
  const { family, byId } = useFamily()

  if (loading) {
    return view === 'grid' ? (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[168px] rounded-[1.25rem]" />
        ))}
      </div>
    ) : (
      <div className="card divide-y divide-line overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5">
            <Skeleton className="size-9" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
          </div>
        ))}
      </div>
    )
  }

  if (view === 'grid') {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
        {items.map((item, i) => {
          const shared = item.sharedWith.map((s) => byId(s.userId)).filter(Boolean) as typeof family
          const visual = item.kind === 'image' || item.kind === 'video'
          return (
            <li key={item.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => h.onOpen(item)}
                onKeyDown={(e) => e.key === 'Enter' && h.onOpen(item)}
                className="card group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:glow"
              >
                <div className="relative h-24 overflow-hidden bg-surface-2 sm:h-28">
                  {item.previewUrl ? (
                    <SafeImage
                      src={item.previewUrl}
                      className="size-full object-cover transition duration-500 group-hover:scale-105"
                      fallback={
                        <div className="grid size-full place-items-center">
                          <FileIcon item={item} size="lg" />
                        </div>
                      }
                    />
                  ) : visual && (IS_DEMO || item.localPreviewUrl) ? (
                    item.localPreviewUrl && item.kind === 'image' ? (
                      <img src={item.localPreviewUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <SceneArt seed={seedFrom(item.id)} className="size-full opacity-90 transition group-hover:scale-105 group-hover:opacity-100" />
                    )
                  ) : (
                    <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_120%,var(--hc-surface-3),transparent_70%)]">
                      <FileIcon item={item} size="lg" className="transition-transform duration-300 group-hover:scale-110" />
                    </div>
                  )}
                  {item.favorite && (
                    <Star className="absolute top-2.5 left-2.5 size-4 fill-warn text-warn drop-shadow" aria-label="Favorito" />
                  )}
                  <div className="absolute top-1.5 right-1.5 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <ActionsButton item={item} h={h} className="bg-surface/80 backdrop-blur" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3.5">
                  <p className="line-clamp-2 text-sm leading-snug font-semibold break-words text-fg" title={item.name}>
                    {item.name}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <p className="truncate text-xs text-subtle">
                      {describe(item)} · {timeAgo(item.modifiedAt)}
                    </p>
                    {shared.length > 0 && <AvatarStack users={shared} size={20} max={3} />}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="hidden grid-cols-[minmax(0,1fr)_140px_120px_110px_48px] gap-4 border-b border-line px-4 py-2.5 text-xs font-semibold tracking-wide text-subtle uppercase md:grid">
        <span>Nome</span>
        <span>{showOwner ? 'Dono' : 'Acesso'}</span>
        <span>Modificado</span>
        <span className="text-right">Tamanho</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const shared = item.sharedWith.map((s) => byId(s.userId)).filter(Boolean) as typeof family
          const owner = byId(item.ownerId)
          return (
            <li
              key={item.id}
              tabIndex={0}
              onClick={() => h.onOpen(item)}
              onKeyDown={(e) => e.key === 'Enter' && h.onOpen(item)}
              className="group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3 py-2.5 transition hover:bg-surface-2/70 md:grid-cols-[minmax(0,1fr)_140px_120px_110px_48px] md:px-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileIcon item={item} size="sm" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-fg">
                    <span className="truncate">{item.name}</span>
                    {item.favorite && <Star className="size-3.5 shrink-0 fill-warn text-warn" aria-label="Favorito" />}
                  </p>
                  <p className="truncate text-xs text-subtle md:hidden">
                    {KIND_LABEL[item.kind]} · {describe(item)} · {timeAgo(item.modifiedAt)}
                  </p>
                </div>
              </div>
              <div className="hidden md:block">
                {showOwner && owner ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Avatar user={owner} size={24} /> <span className="truncate">{owner.name}</span>
                  </div>
                ) : shared.length ? (
                  <AvatarStack users={shared} size={24} max={3} />
                ) : (
                  <span className="text-sm text-subtle">Só você</span>
                )}
              </div>
              <span className="hidden text-sm text-muted md:block">{timeAgo(item.modifiedAt)}</span>
              <span className="hidden text-right text-sm text-muted tabular-nums md:block">{describe(item)}</span>
              <div className="flex justify-end">
                <ActionsButton item={item} h={h} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function SharedBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-subtle">
      <Users className="size-3.5" /> {count}
    </span>
  )
}
