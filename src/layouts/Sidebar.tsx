import { NavLink } from 'react-router-dom'
import { CloudUpload } from 'lucide-react'
import { Logo } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/misc'
import { ADMIN_NAV, NAV } from './nav'
import { useAuth } from '../contexts/AuthContext'
import { useUploads } from '../contexts/UploadContext'
import { formatBytes, percent } from '../lib/format'
import { cn } from '../lib/cn'

export function Sidebar({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { user } = useAuth()
  const { openUpload } = useUploads()
  const pct = user ? percent(user.usedBytes, user.quotaBytes) : 0

  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all',
      isActive ? 'bg-brand-soft text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
    )

  return (
    <aside className={cn('flex h-full flex-col gap-6 p-5', className)}>
      <Logo className="px-1" />

      <Button
        size="lg"
        className="w-full"
        icon={<CloudUpload className="size-5" />}
        onClick={() => {
          onNavigate?.()
          openUpload()
        }}
      >
        Enviar arquivos
      </Button>

      <nav className="-mx-1 flex flex-col gap-1" aria-label="Menu principal">
        {NAV.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} end={'end' in rest} className={link} onClick={onNavigate}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-gradient-brand" />}
                <Icon className={cn('size-5 transition-colors', isActive ? 'text-brand' : 'text-subtle group-hover:text-muted')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <>
            <div className="mx-3 my-3 h-px bg-line" />
            <NavLink to={ADMIN_NAV.to} className={link} onClick={onNavigate}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-gradient-brand" />}
                  <ADMIN_NAV.icon className={cn('size-5', isActive ? 'text-brand-2' : 'text-subtle')} />
                  {ADMIN_NAV.label}
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {user && (
        <div className="mt-auto rounded-2xl border border-line bg-surface-2/60 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-fg">Seu espaço</p>
            <p className="text-xs text-subtle">{pct}%</p>
          </div>
          <ProgressBar value={pct} tone={pct >= 90 ? 'danger' : pct >= 75 ? 'warn' : 'brand'} />
          <p className="mt-2 text-xs text-muted">
            {formatBytes(user.usedBytes)} de {formatBytes(user.quotaBytes, 0)} usados
          </p>
        </div>
      )}
    </aside>
  )
}
