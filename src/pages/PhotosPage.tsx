import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Images, Search, Heart, X, ChevronLeft, ChevronRight, Play, Calendar, HardDrive, Tag, Info, ImagePlus, SearchX, Video } from 'lucide-react'
import { createPortal } from 'react-dom'
import { api } from '../services'
import { useAsync, errorMessage } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useUploads } from '../contexts/UploadContext'
import { useToast } from '../contexts/ToastContext'
import { useFamily } from '../hooks/useFamily'
import { MediaPlaceholder, PhotoThumb, SceneArt } from '../components/PhotoThumb'
import { Button } from '../components/ui/Button'
import { Avatar, EmptyState, Skeleton } from '../components/ui/misc'
import { DemoTag } from '../components/DemoBanner'
import type { MediaItem } from '../types'
import { formatBytes, formatDateTime, formatDuration, formatMonthYear } from '../lib/format'
import { cn } from '../lib/cn'
import { IS_DEMO } from '../services/config'
import { SafeImage } from '../components/SafeImage'
import { largePreview } from '../lib/routes'

type Filter = 'all' | 'photo' | 'video' | 'favorite'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'photo', label: 'Fotos' },
  { value: 'video', label: 'Vídeos' },
  { value: 'favorite', label: 'Favoritos' },
]

export default function PhotosPage() {
  const { version, openUpload } = useUploads()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const media = useAsync(() => api.media.list(), [version])
  const [filter, setFilter] = useState<Filter>('all')
  const [album, setAlbum] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const q = useDebounce(query, 250).trim().toLocaleLowerCase('pt-BR')

  const all = useMemo(() => media.data ?? [], [media.data])
  const albums = useMemo(() => Array.from(new Set(all.map((m) => m.album).filter(Boolean))) as string[], [all])

  const visible = useMemo(
    () =>
      all.filter((m) => {
        if (filter === 'photo' && m.type !== 'photo') return false
        if (filter === 'video' && m.type !== 'video') return false
        if (filter === 'favorite' && !m.favorite) return false
        if (album && m.album !== album) return false
        if (q && !`${m.name} ${m.album ?? ''} ${formatMonthYear(m.takenAt)}`.toLocaleLowerCase('pt-BR').includes(q)) return false
        return true
      }),
    [all, filter, album, q],
  )

  // Agrupa por mês/ano
  const groups = useMemo(() => {
    const map = new Map<string, MediaItem[]>()
    for (const m of visible) {
      const key = m.takenAt.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return Array.from(map.entries())
  }, [visible])

  const viewingId = params.get('ver')
  const viewingIndex = visible.findIndex((m) => m.id === viewingId)
  const viewing = viewingIndex >= 0 ? visible[viewingIndex] : null

  const openItem = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('ver', id)
    else next.delete('ver')
    setParams(next, { replace: !!viewingId })
  }

  async function toggleFav(m: MediaItem) {
    try {
      const updated = await api.media.toggleFavorite(m.id)
      media.setData((list) => list?.map((x) => (x.id === m.id ? updated : x)))
      toast.success(updated.favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
    } catch (e) {
      toast.error('Não foi possível favoritar', errorMessage(e))
    }
  }

  const photosCount = all.filter((m) => m.type === 'photo').length
  const videosCount = all.length - photosCount

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Fotos e vídeos</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-subtle">
            {media.loading ? 'Carregando lembranças…' : `${photosCount} fotos · ${videosCount} vídeos`}
            <DemoTag />
          </p>
        </div>
        <Button icon={<ImagePlus className="size-[18px]" />} onClick={() => openUpload({ target: 'media' })}>
          Enviar fotos e vídeos
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="group flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 transition focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10 sm:w-72">
            <Search className="size-4 text-subtle group-focus-within:text-brand" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar por nome, álbum ou mês"
              aria-label="Procurar fotos"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Limpar" className="text-subtle hover:text-fg">
                <X className="size-4" />
              </button>
            )}
          </label>
          <div role="radiogroup" aria-label="Tipo" className="scrollbar-thin flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.value === 'favorite' && <Heart className="size-3.5" />}
                {f.value === 'video' && <Video className="size-3.5" />}
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
        {albums.length > 0 && (
          <div className="scrollbar-thin -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <span className="flex shrink-0 items-center gap-1.5 pr-1 text-xs font-semibold text-subtle">
              <Tag className="size-3.5" /> Álbuns
            </span>
            {albums.map((a) => (
              <Chip key={a} small active={album === a} onClick={() => setAlbum(album === a ? null : a)}>
                {a}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {media.loading && (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      )}

      {media.error && <EmptyState icon={<Images className="size-7" />} title="Não foi possível abrir a galeria" body={media.error} action={<Button onClick={media.reload}>Tentar de novo</Button>} />}

      {!media.loading && !media.error && visible.length === 0 && (
        all.length === 0 ? (
          <EmptyState
            icon={<Images className="size-7" />}
            title="A galeria ainda está vazia"
            body="Envie as fotos do celular e elas aparecem aqui, organizadas por data."
            action={<Button icon={<ImagePlus className="size-4" />} onClick={() => openUpload({ target: 'media' })}>Enviar fotos</Button>}
          />
        ) : (
          <EmptyState
            icon={<SearchX className="size-7" />}
            title="Nenhuma foto com esses filtros"
            body="Tente outro termo ou limpe os filtros."
            action={
              <Button variant="secondary" onClick={() => (setFilter('all'), setAlbum(null), setQuery(''))}>
                Limpar filtros
              </Button>
            }
          />
        )
      )}

      <div className="space-y-8">
        {groups.map(([key, items]) => (
          <section key={key} aria-label={formatMonthYear(items[0].takenAt)}>
            <div className="sticky top-16 z-10 -mx-4 mb-3 flex items-baseline gap-3 bg-bg/80 px-4 py-2 backdrop-blur-md sm:top-[72px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <h2 className="font-display text-lg font-semibold text-fg">{formatMonthYear(items[0].takenAt)}</h2>
              <span className="text-sm text-subtle">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
            </div>
            <ul className="grid grid-flow-dense grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
              {items.map((m, i) => (
                <li key={m.id} className={cn('animate-fade-up', i % 9 === 0 && items.length > 4 && 'col-span-2 row-span-2')} style={{ animationDelay: `${Math.min(i, 14) * 20}ms` }}>
                  <button
                    onClick={() => openItem(m.id)}
                    className="group relative block size-full overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-brand sm:rounded-2xl"
                    aria-label={`${m.type === 'video' ? 'Vídeo' : 'Foto'} ${m.name}, ${formatDateTime(m.takenAt)}`}
                  >
                    <PhotoThumb item={m} className="aspect-square size-full transition duration-500 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    {m.favorite && <Heart className="absolute top-2 left-2 size-4 fill-white text-white drop-shadow-md" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {viewing && (
        <Lightbox
          item={viewing}
          index={viewingIndex}
          total={visible.length}
          onClose={() => openItem(null)}
          onPrev={() => viewingIndex > 0 && openItem(visible[viewingIndex - 1].id)}
          onNext={() => viewingIndex < visible.length - 1 && openItem(visible[viewingIndex + 1].id)}
          onFavorite={() => toggleFav(viewing)}
        />
      )}
    </div>
  )
}

function Chip({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: ReactNode; small?: boolean }) {
  return (
    <button
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition',
        small ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        active ? 'border-transparent bg-gradient-brand text-white shadow-[0_6px_18px_-6px_rgb(91_140_255/0.7)]' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

function Lightbox({
  item,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onFavorite,
}: {
  item: MediaItem
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onFavorite: () => void
}) {
  const { byId } = useFamily()
  const [info, setInfo] = useState(false)
  const [playNotice, setPlayNotice] = useState(false)
  const owner = byId(item.ownerId)

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    },
    [onClose, onPrev, onNext],
  )

  useEffect(() => {
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onKey])

  useEffect(() => setPlayNotice(false), [item.id])

  // Deslizar no celular para trocar de foto
  const [touchX, setTouchX] = useState<number | null>(null)

  const ratio = item.width / item.height

  return createPortal(
    <div className="fixed inset-0 z-[70] flex animate-fade-in flex-col bg-[#03050d]/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={item.name}>
      <div className="flex items-center gap-2 p-3 text-white sm:p-4">
        <button onClick={onClose} className="rounded-xl p-2.5 hover:bg-white/10" aria-label="Fechar">
          <X className="size-6" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="text-xs text-white/60">{formatDateTime(item.takenAt)} · {index + 1} de {total}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onFavorite} className="rounded-xl p-2.5 hover:bg-white/10" aria-label={item.favorite ? 'Tirar dos favoritos' : 'Favoritar'} aria-pressed={item.favorite}>
            <Heart className={cn('size-5 transition', item.favorite && 'scale-110 fill-[#f472b6] text-[#f472b6]')} />
          </button>
          <button onClick={() => setInfo((v) => !v)} className={cn('rounded-xl p-2.5 hover:bg-white/10', info && 'bg-white/10')} aria-label="Informações" aria-pressed={info}>
            <Info className="size-5" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div
          className="relative flex min-w-0 flex-1 items-center justify-center px-2 pb-6 sm:px-16"
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return
            const dx = e.changedTouches[0].clientX - touchX
            if (dx > 50) onPrev()
            if (dx < -50) onNext()
            setTouchX(null)
          }}
        >
          <div
            key={item.id}
            className="relative max-h-full w-full max-w-5xl animate-scale-in overflow-hidden rounded-2xl shadow-2xl"
            style={{ aspectRatio: ratio, maxWidth: `min(100%, calc((100dvh - 140px) * ${ratio}))` }}
          >
            {item.localPreviewUrl ? (
              item.type === 'video' ? (
                <video src={item.localPreviewUrl} controls autoPlay className="size-full bg-black object-contain" />
              ) : (
                <img src={item.localPreviewUrl} alt={item.name} className="size-full object-contain" />
              )
            ) : !IS_DEMO && item.type === 'video' && item.downloadUrl ? (
              <video
                src={item.downloadUrl}
                poster={item.previewUrl ? largePreview(item.previewUrl) : undefined}
                controls
                playsInline
                preload="metadata"
                className="size-full bg-black object-contain"
              />
            ) : !IS_DEMO ? (
              <SafeImage
                src={item.previewUrl ? largePreview(item.previewUrl) : (item.downloadUrl ?? '')}
                alt={item.name}
                loading="eager"
                className="size-full bg-black/40 object-contain"
                fallback={<MediaPlaceholder type={item.type} />}
              />
            ) : (
              <>
                <SceneArt seed={item.seed} className="size-full" />
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25">
                    <button
                      onClick={() => setPlayNotice(true)}
                      className="grid size-20 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition hover:scale-105 hover:bg-white/25"
                      aria-label="Reproduzir vídeo"
                    >
                      <Play className="ml-1 size-9 fill-white" />
                    </button>
                    {playNotice && (
                      <p className="mt-4 max-w-xs animate-fade-up rounded-xl bg-black/60 px-4 py-2 text-center text-sm text-white backdrop-blur">
                        {IS_DEMO ? 'Vídeo fictício da demonstração. A reprodução funciona com vídeos enviados ou com o servidor conectado.' : 'Carregando vídeo…'}
                      </p>
                    )}
                    {item.durationSec && (
                      <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
                        {formatDuration(item.durationSec)}
                      </span>
                    )}
                  </div>
                )}
                {IS_DEMO && item.type === 'photo' && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur">Imagem ilustrativa</span>
                )}
              </>
            )}
          </div>

          <button
            onClick={onPrev}
            disabled={index === 0}
            className="absolute top-1/2 left-3 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-20 sm:block"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={onNext}
            disabled={index === total - 1}
            className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-20 sm:block"
            aria-label="Próxima"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>

        {info && (
          <aside className="absolute inset-x-0 bottom-0 max-h-[50%] animate-fade-up overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0d1328] p-5 text-white sm:static sm:max-h-none sm:w-80 sm:rounded-none sm:border-t-0 sm:border-l">
            <h3 className="font-display font-semibold">Detalhes</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <InfoRow icon={<Calendar className="size-4" />} label="Data" value={formatDateTime(item.takenAt)} />
              <InfoRow icon={<HardDrive className="size-4" />} label="Tamanho" value={`${formatBytes(item.size)} · ${item.width}×${item.height}`} />
              {item.album && <InfoRow icon={<Tag className="size-4" />} label="Álbum" value={item.album} />}
              {owner && (
                <div className="flex items-center gap-3">
                  <Avatar user={owner} size={32} />
                  <div>
                    <dt className="text-xs text-white/50">Enviado por</dt>
                    <dd className="font-medium">{owner.name}</dd>
                  </div>
                </div>
              )}
            </dl>
          </aside>
        )}
      </div>
    </div>,
    document.body,
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-lg bg-white/8 text-white/70">{icon}</span>
      <div>
        <dt className="text-xs text-white/50">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  )
}
