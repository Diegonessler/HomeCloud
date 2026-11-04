import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CloudUpload,
  FolderPlus,
  Images,
  Upload,
  Share2,
  Trash2,
  Pencil,
  Star,
  RotateCcw,
  LogIn,
  Sparkles,
} from 'lucide-react'
import { api } from '../services'
import { useAsync, errorMessage } from '../hooks/useAsync'
import { useAuth } from '../contexts/AuthContext'
import { useUploads } from '../contexts/UploadContext'
import { useToast } from '../contexts/ToastContext'
import { useFamily } from '../hooks/useFamily'
import { Button } from '../components/ui/Button'
import { Avatar, SectionTitle, Skeleton } from '../components/ui/misc'
import { StorageRing } from '../components/StorageRing'
import { FileIcon, KIND_COLOR } from '../components/FileIcon'
import { PhotoThumb } from '../components/PhotoThumb'
import { NameDialog } from '../components/dialogs'
import { DemoTag } from '../components/DemoBanner'
import { firstName, formatBytes, greeting, timeAgo, percent } from '../lib/format'
import type { ActivityType } from '../types'
import { describeItem, folderHref } from '../lib/routes'

const ACT: Record<ActivityType, { icon: typeof Upload; verb: string; color: string }> = {
  upload: { icon: Upload, verb: 'enviou', color: '#5b8cff' },
  share: { icon: Share2, verb: 'compartilhou', color: '#a78bfa' },
  delete: { icon: Trash2, verb: 'apagou', color: '#f87171' },
  rename: { icon: Pencil, verb: 'renomeou', color: '#fbbf24' },
  folder: { icon: FolderPlus, verb: 'criou', color: '#34d399' },
  favorite: { icon: Star, verb: 'favoritou', color: '#fbbf24' },
  restore: { icon: RotateCcw, verb: 'recuperou', color: '#22d3ee' },
  login: { icon: LogIn, verb: 'entrou', color: '#94a3b8' },
}

const BREAKDOWN_COLORS = ['#8b5cf6', '#5b8cff', '#22d3ee', '#64748b']

export default function DashboardPage() {
  const { user } = useAuth()
  const { openUpload, version } = useUploads()
  const { byId } = useFamily()
  const toast = useToast()
  const navigate = useNavigate()
  const [newFolder, setNewFolder] = useState(false)
  const [creating, setCreating] = useState(false)

  const storage = useAsync(() => api.files.storage(), [version])
  const recent = useAsync(() => api.files.recent(6), [version])
  const photos = useAsync(() => api.media.list().then((m) => m.slice(0, 8)), [version])
  const favorites = useAsync(() => api.files.favorites().then((f) => f.filter((x) => x.kind === 'folder')), [])
  const activity = useAsync(() => api.activity.recent(6), [version])

  async function createFolder(name: string) {
    setCreating(true)
    try {
      const f = await api.files.createFolder(null, name)
      toast.success('Pasta criada', `"${f.name}" está em Meus arquivos.`)
      setNewFolder(false)
      navigate(folderHref(f.id))
    } catch (e) {
      toast.error('Não foi possível criar a pasta', errorMessage(e))
    } finally {
      setCreating(false)
    }
  }

  const s = storage.data
  const free = s ? s.quotaBytes - s.usedBytes : 0
  const pct = s ? percent(s.usedBytes, s.quotaBytes) : 0

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Boas-vindas + espaço */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <div className="card relative animate-fade-up overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.35),transparent_65%)] blur-2xl" />
          <div className="pointer-events-none absolute -bottom-28 left-10 size-72 rounded-full bg-[radial-gradient(circle,rgb(59_130_246/0.25),transparent_65%)] blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2/70 px-3 py-1 text-xs font-semibold text-muted">
              <Sparkles className="size-3.5 text-brand-2" /> {greeting()}
            </span>
            <h1 className="mt-4 font-display text-[28px] leading-tight font-semibold tracking-tight text-fg sm:text-4xl">
              Olá, {user ? firstName(user.name) : ''}! <span className="text-gradient">Tudo guardado.</span>
            </h1>
            <p className="mt-3 max-w-lg text-[15px] text-muted">
              As fotos, vídeos e documentos da família estão seguros no servidor de casa. O que você quer fazer hoje?
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button size="lg" icon={<CloudUpload className="size-5" />} onClick={() => openUpload()}>
                Enviar arquivos
              </Button>
              <Button size="lg" variant="secondary" icon={<Images className="size-5" />} onClick={() => openUpload({ target: 'media' })}>
                Enviar fotos
              </Button>
              <Button size="lg" variant="ghost" icon={<FolderPlus className="size-5" />} onClick={() => setNewFolder(true)}>
                Nova pasta
              </Button>
            </div>
          </div>
        </div>

        <div className="card animate-fade-up p-6 [animation-delay:60ms]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">Seu espaço</h2>
              <p className="text-sm text-subtle">Quanto você já usou</p>
            </div>
            <DemoTag />
          </div>
          {s ? (
            <>
              <div className="mt-5 flex items-center gap-6">
                <StorageRing used={s.usedBytes} total={s.quotaBytes} size={128} />
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-subtle">Usado</p>
                    <p className="font-display text-xl font-semibold text-fg">{formatBytes(s.usedBytes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-subtle">Disponível</p>
                    <p className="font-display text-xl font-semibold text-ok">{formatBytes(free)}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-surface-3">
                {s.breakdown.map((b, i) => (
                  <div key={b.label} style={{ width: `${(b.bytes / s.quotaBytes) * 100}%`, background: BREAKDOWN_COLORS[i] }} />
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {s.breakdown.map((b, i) => (
                  <li key={b.label} className="flex items-center gap-2 text-xs text-muted">
                    <span className="size-2 rounded-full" style={{ background: BREAKDOWN_COLORS[i] }} />
                    <span className="truncate">{b.label}</span>
                    <span className="ml-auto whitespace-nowrap text-subtle tabular-nums">{formatBytes(b.bytes, 0)}</span>
                  </li>
                ))}
              </ul>
              {pct >= 85 && <p className="mt-3 text-xs text-warn">Seu espaço está quase cheio. Que tal limpar a lixeira?</p>}
            </>
          ) : (
            <div className="mt-5 flex items-center gap-6">
              <Skeleton className="size-32 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pastas favoritas */}
      <section>
        <SectionTitle title="Pastas favoritas" action={<SeeAll to="/favoritos" />} />
        <div className="scrollbar-thin -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {favorites.loading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[76px] min-w-[220px] rounded-[1.25rem]" />)}
          {favorites.data?.map((f, i) => (
            <Link
              key={f.id}
              to={folderHref(f.id)}
              className="card group flex min-w-[220px] animate-fade-up snap-start items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:glow"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <FileIcon item={f} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-fg">{f.name}</p>
                <p className="text-xs text-subtle">{describeItem(f)}</p>
              </div>
              <ArrowRight className="ml-auto size-4 text-subtle opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </section>

      {/* Fotos recentes */}
      <section>
        <SectionTitle title="Fotos recentes" action={<SeeAll to="/fotos" />} />
        {/* uma única linha: o que não cabe na largura fica oculto */}
        <div className="grid auto-rows-[0] grid-cols-4 grid-rows-1 gap-x-2 overflow-hidden sm:grid-cols-6 sm:gap-x-3 lg:grid-cols-8">
          {photos.loading && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
          {photos.data?.map((m, i) => (
            <Link
              key={m.id}
              to={`/fotos?ver=${m.id}`}
              className="group animate-fade-up overflow-hidden rounded-2xl"
              style={{ animationDelay: `${i * 30}ms` }}
              aria-label={m.name}
            >
              <PhotoThumb item={m} className="aspect-square transition duration-500 group-hover:scale-105" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recentes + atividade */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <SectionTitle title="Arquivos recentes" action={<SeeAll to="/arquivos" />} />
          <div className="card divide-y divide-line overflow-hidden">
            {recent.loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="size-9" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            {recent.data?.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(folderHref(f.parentId))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2/70"
              >
                <FileIcon item={f} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{f.name}</p>
                  <p className="text-xs text-subtle">
                    {formatBytes(f.size)} · {timeAgo(f.modifiedAt)}
                  </p>
                </div>
                <span className="hidden size-2 rounded-full sm:block" style={{ background: KIND_COLOR[f.kind] }} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle title="Atividade recente" />
          <div className="card p-2">
            {activity.loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              ))}
            <ol className="relative">
              {activity.data?.map((a, i) => {
                const u = byId(a.userId)
                const meta = ACT[a.type]
                const Icon = meta.icon
                const isMe = a.userId === user?.id
                return (
                  <li key={a.id} className="relative flex gap-3 rounded-xl p-3">
                    {i < (activity.data?.length ?? 0) - 1 && <span className="absolute top-12 bottom-0 left-[29px] w-px bg-line" />}
                    <div className="relative">
                      <Avatar user={u} size={34} />
                      <span
                        className="absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full ring-2 ring-surface"
                        style={{ background: meta.color }}
                      >
                        <Icon className="size-2.5 text-white" strokeWidth={3} />
                      </span>
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm text-muted">
                        {a.text ? (
                          <span className="text-fg">{a.text}</span>
                        ) : (
                          <>
                            <span className="font-semibold text-fg">{isMe ? 'Você' : u?.name}</span> {meta.verb} {a.target}
                          </>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-subtle">{timeAgo(a.at)}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </section>

      <NameDialog open={newFolder} mode="folder" onClose={() => setNewFolder(false)} onSubmit={createFolder} loading={creating} />
    </div>
  )
}

function SeeAll({ to }: { to: string }) {
  return (
    <Link to={to} className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
      Ver tudo <ArrowRight className="size-4" />
    </Link>
  )
}
