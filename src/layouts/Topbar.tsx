import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, Menu as MenuIcon, Search, LogOut, UserRound, ShieldCheck, Moon, Sun, Share2, HardDrive, Server } from 'lucide-react'
import { Menu } from '../components/ui/Menu'
import { Avatar } from '../components/ui/misc'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../services'
import type { AppNotification } from '../types'
import { firstName, formatLongToday, timeAgo } from '../lib/format'
import { cn } from '../lib/cn'

const NOTIF_ICON = { share: Share2, storage: HardDrive, system: Server }

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth()
  const { resolved, setPref } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [q, setQ] = useState('')
  const [notes, setNotes] = useState<AppNotification[]>([])

  useEffect(() => {
    api.activity.notifications().then(setNotes).catch(() => setNotes([]))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setQ(params.get('q') ?? '')
  }, [location.search])

  const unread = notes.filter((n) => !n.read).length

  function search(e: FormEvent) {
    e.preventDefault()
    if (q.trim()) navigate(`/arquivos?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:h-[72px] sm:px-6 lg:px-8">
        <button onClick={onOpenMenu} className="-ml-1 rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-fg lg:hidden" aria-label="Abrir menu">
          <MenuIcon className="size-6" />
        </button>
        <LogoMark size={30} className="lg:hidden" />

        <div className="hidden min-w-0 md:block">
          <p className="truncate font-display text-lg leading-tight font-semibold text-fg">Olá, {user ? firstName(user.name) : ''}!</p>
          <p className="truncate text-[13px] text-subtle">{formatLongToday()}</p>
        </div>

        <form onSubmit={search} className="ml-auto hidden w-full max-w-sm sm:block md:ml-8 lg:max-w-md" role="search">
          <label className="group flex h-11 items-center gap-2.5 rounded-xl border border-line bg-surface/70 px-3.5 transition focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10">
            <Search className="size-[18px] text-subtle group-focus-within:text-brand" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar arquivos e pastas"
              aria-label="Procurar arquivos e pastas"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-2">
          <button
            onClick={() => navigate('/arquivos?buscar=1')}
            className="rounded-xl p-2.5 text-muted hover:bg-surface-2 hover:text-fg sm:hidden"
            aria-label="Procurar"
          >
            <Search className="size-5" />
          </button>

          <button
            onClick={() => setPref(resolved === 'dark' ? 'light' : 'dark')}
            className="hidden rounded-xl p-2.5 text-muted transition hover:bg-surface-2 hover:text-fg sm:block"
            aria-label={resolved === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={resolved === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {resolved === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>

          <Menu
            label="Notificações"
            panelClassName="w-[min(92vw,360px)] p-2"
            trigger={({ toggle, open }) => (
              <button
                onClick={toggle}
                className={cn('relative rounded-xl p-2.5 text-muted transition hover:bg-surface-2 hover:text-fg', open && 'bg-surface-2 text-fg')}
                aria-label={`Notificações${unread ? `, ${unread} novas` : ''}`}
              >
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-gradient-brand text-[10px] font-bold text-white ring-2 ring-bg">
                    {unread}
                  </span>
                )}
              </button>
            )}
          >
            {() => (
              <div>
                <div className="flex items-center justify-between px-2 pt-1 pb-2">
                  <p className="font-display text-sm font-semibold text-fg">Notificações</p>
                  {unread > 0 && (
                    <button
                      className="text-xs font-semibold text-brand hover:underline"
                      onClick={async () => {
                        await api.activity.markAllRead()
                        setNotes((n) => n.map((x) => ({ ...x, read: true })))
                      }}
                    >
                      Marcar como lidas
                    </button>
                  )}
                </div>
                {notes.length === 0 && <p className="px-2 py-6 text-center text-sm text-subtle">Nenhuma novidade por aqui.</p>}
                <ul className="space-y-0.5">
                  {notes.map((n) => {
                    const Icon = NOTIF_ICON[n.kind]
                    return (
                      <li key={n.id} className={cn('flex gap-3 rounded-xl p-2.5', !n.read && 'bg-brand-soft/60')}>
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-brand">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-fg">{n.title}</p>
                          <p className="text-[13px] text-muted">{n.body}</p>
                          <p className="mt-0.5 text-xs text-subtle">{timeAgo(n.at)}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </Menu>

          <Menu
            label="Menu do perfil"
            trigger={({ toggle }) => (
              <button onClick={toggle} className="ml-1 rounded-full p-0.5 transition hover:ring-4 hover:ring-brand/15" aria-label="Abrir menu do perfil">
                <Avatar user={user ?? undefined} size={36} />
              </button>
            )}
            items={[
              { label: 'Minha conta', icon: <UserRound />, onSelect: () => navigate('/conta') },
              { label: 'Administração', icon: <ShieldCheck />, onSelect: () => navigate('/admin'), hidden: user?.role !== 'admin' },
              { label: resolved === 'dark' ? 'Tema claro' : 'Tema escuro', icon: resolved === 'dark' ? <Sun /> : <Moon />, onSelect: () => setPref(resolved === 'dark' ? 'light' : 'dark') },
              {
                label: 'Sair',
                icon: <LogOut />,
                danger: true,
                onSelect: async () => {
                  await logout()
                  navigate('/entrar')
                },
              },
            ]}
          />
        </div>
      </div>
    </header>
  )
}
