import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Inbox, Send, Home, Lock, Eye, PenLine, Share2, ArrowRight, HeartHandshake } from 'lucide-react'
import { api } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useFamily } from '../hooks/useFamily'
import { useFileActions } from '../hooks/useFileActions'
import { useAuth } from '../contexts/AuthContext'
import { FileIcon } from '../components/FileIcon'
import { FilePreview } from '../components/FilePreview'
import { ShareDialog } from '../components/dialogs'
import { Avatar, EmptyState, Skeleton, Badge } from '../components/ui/misc'
import { Button } from '../components/ui/Button'
import type { FileItem, ShareEntry, User } from '../types'
import { timeAgo } from '../lib/format'
import { cn } from '../lib/cn'
import { describeItem, folderHref } from '../lib/routes'

type Tab = 'with-me' | 'by-me' | 'family' | 'private'

const TABS: { value: Tab; label: string; icon: typeof Inbox; help: string }[] = [
  { value: 'with-me', label: 'Comigo', icon: Inbox, help: 'Coisas que outras pessoas da família dividiram com você.' },
  { value: 'by-me', label: 'Por mim', icon: Send, help: 'Coisas suas que você deixou outras pessoas verem.' },
  { value: 'family', label: 'Pastas da família', icon: Home, help: 'Pastas que todos usam juntos, como receitas e fotos antigas.' },
  { value: 'private', label: 'Privados', icon: Lock, help: 'Itens divididos entre apenas duas pessoas.' },
]

export default function SharedPage() {
  const [tab, setTab] = useState<Tab>('with-me')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<FileItem | null>(null)

  const withMe = useAsync(() => api.sharing.list('with-me'), [])
  const byMe = useAsync(() => api.sharing.list('by-me'), [])
  const family = useAsync(() => api.sharing.familyFolders(), [])
  const actions = useFileActions(() => {
    byMe.reload()
    family.reload()
  })

  const familyEntries: ShareEntry[] = useMemo(
    () => (family.data ?? []).map((item) => ({ id: item.id, item, ownerId: item.ownerId, targets: item.sharedWith, sharedAt: item.modifiedAt })),
    [family.data],
  )
  const privateEntries = useMemo(
    () => [...(withMe.data ?? []), ...(byMe.data ?? [])].filter((s) => s.targets.length === 1),
    [withMe.data, byMe.data],
  )

  const lists: Record<Tab, { data: ShareEntry[]; loading: boolean }> = {
    'with-me': { data: withMe.data ?? [], loading: withMe.loading },
    'by-me': { data: byMe.data ?? [], loading: byMe.loading },
    family: { data: familyEntries, loading: family.loading },
    private: { data: privateEntries, loading: withMe.loading || byMe.loading },
  }
  const current = lists[tab]
  const meta = TABS.find((t) => t.value === tab)!

  function open(item: FileItem) {
    if (item.kind === 'folder') navigate(folderHref(item.id))
    else setPreview(item)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Compartilhados</h1>
        <p className="mt-1 text-sm text-subtle">Tudo o que você divide com a família, num só lugar.</p>
      </div>

      {/* Explicação simples */}
      <div className="card mb-6 flex items-start gap-4 p-5">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-soft text-brand-2">
          <HeartHandshake className="size-5" />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-fg">Como funciona</p>
          <p className="mt-1 text-muted">
            Para dividir um arquivo, toque em <b className="text-fg">⋮</b> e depois em <b className="text-fg">Compartilhar</b>. Você escolhe se a pessoa
            <span className="mx-1 inline-flex items-center gap-1 text-fg"><Eye className="size-3.5" /> pode ver</span> ou
            <span className="mx-1 inline-flex items-center gap-1 text-fg"><PenLine className="size-3.5" /> pode editar</span>. Ninguém fora da família tem acesso.
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Tipo de compartilhamento" className="scrollbar-thin -mx-4 mb-2 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const Icon = t.icon
          const count = lists[t.value].data.length
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                tab === t.value ? 'bg-surface text-fg shadow-[var(--hc-shadow)] ring-1 ring-line-strong' : 'text-subtle hover:text-fg',
              )}
            >
              <Icon className={cn('size-4', tab === t.value && 'text-brand')} />
              {t.label}
              {!lists[t.value].loading && <span className="rounded-full bg-surface-3 px-1.5 text-xs text-muted">{count}</span>}
            </button>
          )
        })}
      </div>
      <p className="mb-5 text-sm text-subtle">{meta.help}</p>

      {current.loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[1.25rem]" />
          ))}
        </div>
      ) : current.data.length === 0 ? (
        <EmptyState
          icon={<Users className="size-7" />}
          title={tab === 'with-me' ? 'Ninguém compartilhou nada ainda' : 'Nada por aqui'}
          body={tab === 'by-me' ? 'Quando você compartilhar um arquivo com alguém, ele aparece aqui.' : 'Quando houver itens compartilhados, eles aparecem aqui.'}
          action={tab === 'by-me' ? <Button variant="secondary" onClick={() => navigate('/arquivos')}>Ir para Meus arquivos</Button> : undefined}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {current.data.map((s, i) => (
            <ShareCard
              key={s.id}
              entry={s}
              delay={i * 40}
              meId={user?.id}
              onOpen={() => open(s.item)}
              onManage={s.ownerId === user?.id ? () => actions.setSharing(s.item) : undefined}
            />
          ))}
        </ul>
      )}

      <FilePreview item={preview} onClose={() => setPreview(null)} onDownload={actions.download} />
      <ShareDialog item={actions.sharing} onClose={() => actions.setSharing(null)} onChanged={() => (byMe.reload(), family.reload())} />
    </div>
  )
}

function ShareCard({ entry, onOpen, onManage, meId, delay }: { entry: ShareEntry; onOpen: () => void; onManage?: () => void; meId?: string; delay: number }) {
  const { byId } = useFamily()
  const owner = byId(entry.ownerId)
  const item = entry.item
  const people = entry.targets.map((t) => ({ user: byId(t.userId), perm: t.permission })).filter((p): p is { user: User; perm: typeof p.perm } => !!p.user)

  return (
    <li className="card flex animate-fade-up flex-col p-4 transition hover:border-line-strong" style={{ animationDelay: `${delay}ms` }}>
      <button onClick={onOpen} className="flex items-center gap-3 text-left">
        <FileIcon item={item} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{item.name}</p>
          <p className="truncate text-xs text-subtle">
            {describeItem(item)} · {timeAgo(entry.sharedAt)}
          </p>
        </div>
        <ArrowRight className="size-4 text-subtle" />
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {owner && (
          <Badge tone={owner.id === meId ? 'brand' : 'violet'}>
            {owner.id === meId ? 'Seu' : `De ${owner.name}`}
          </Badge>
        )}
        {item.family && <Badge tone="ok">Família</Badge>}
        <span className="text-xs text-subtle">Quem tem acesso:</span>
        <div className="flex flex-wrap gap-1.5">
          {people.map(({ user, perm }) => (
            <AccessPill key={user.id} user={user} isMe={user.id === meId}>
              {perm === 'edit' ? <PenLine className="size-3" /> : <Eye className="size-3" />}
            </AccessPill>
          ))}
        </div>
        {onManage && (
          <button onClick={onManage} className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">
            <Share2 className="size-3.5" /> Gerenciar
          </button>
        )}
      </div>
    </li>
  )
}

function AccessPill({ user, isMe, children }: { user: User; isMe: boolean; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-0.5 pr-2 pl-0.5 text-xs text-muted" title={`${user.name}`}>
      <Avatar user={user} size={20} />
      {isMe ? 'Você' : user.name.split(' ')[0]}
      <span className="text-subtle">{children}</span>
    </span>
  )
}
