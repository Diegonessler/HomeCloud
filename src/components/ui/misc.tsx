import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'
import type { User } from '../../types'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  body?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex animate-fade-up flex-col items-center px-6 py-14 text-center', className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-gradient-brand opacity-25 blur-2xl" />
        <div className="relative grid size-16 place-items-center rounded-3xl border border-line-strong bg-surface-2 text-brand">
          {icon}
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-fg">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Avatar({ user, size = 36, ring }: { user?: Pick<User, 'name' | 'color' | 'avatarUrl'>; size?: number; ring?: boolean }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) }
  if (!user) return <div className="skeleton rounded-full" style={style} />
  if (user.avatarUrl)
    return <img src={user.avatarUrl} alt={user.name} className={cn('rounded-full object-cover', ring && 'ring-2 ring-surface')} style={style} />
  return (
    <div
      title={user.name}
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold text-white', ring && 'ring-2 ring-surface')}
      style={{ ...style, background: `linear-gradient(135deg, ${user.color}, color-mix(in oklab, ${user.color} 55%, #4c1d95))` }}
    >
      {initials(user.name)}
    </div>
  )
}

export function AvatarStack({ users, max = 4, size = 26 }: { users: User[]; max?: number; size?: number }) {
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size={size} ring />
      ))}
      {extra > 0 && (
        <div
          className="grid place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-muted ring-2 ring-surface"
          style={{ width: size, height: size }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}

export function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'warn' | 'danger' | 'ok'; className?: string }) {
  const tones = {
    brand: 'bg-gradient-brand',
    warn: 'bg-warn',
    danger: 'bg-danger',
    ok: 'bg-ok',
  }
  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tones[tone])} style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  )
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'violet'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-3 text-muted',
    brand: 'bg-brand-soft text-brand',
    violet: 'bg-violet-soft text-brand-2',
    ok: 'bg-ok/12 text-ok',
    warn: 'bg-warn/12 text-warn',
    danger: 'bg-danger/12 text-danger',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-gradient-brand' : 'bg-surface-3')}
    >
      <span className={cn('absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          title={o.label}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-subtle hover:text-fg',
          )}
        >
          {o.icon}
          <span className={o.icon ? 'sr-only sm:not-sr-only' : ''}>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function SectionTitle({ title, action, subtitle }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-base font-semibold text-fg sm:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-subtle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
