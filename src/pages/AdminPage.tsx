import type { ReactNode } from 'react'
import {
  ShieldCheck,
  Server,
  Cpu,
  MemoryStick,
  Thermometer,
  HardDrive,
  DatabaseBackup,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
  Users,
  Activity as ActivityIcon,
  ExternalLink,
} from 'lucide-react'
import { api } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useFamily } from '../hooks/useFamily'
import { Avatar, Badge, EmptyState, ProgressBar, Skeleton } from '../components/ui/misc'
import { Button } from '../components/ui/Button'
import { DemoTag } from '../components/DemoBanner'
import type { BackupInfo, HealthLevel, User } from '../types'
import { formatBytes, formatDateTime, formatUptime, percent, timeAgo } from '../lib/format'
import { cn } from '../lib/cn'

const HEALTH: Record<HealthLevel, { label: string; tone: 'ok' | 'warn' | 'danger'; icon: typeof CheckCircle2; text: string }> = {
  ok: { label: 'Tudo funcionando', tone: 'ok', icon: CheckCircle2, text: 'Nenhum problema encontrado.' },
  warn: { label: 'Precisa de atenção', tone: 'warn', icon: AlertTriangle, text: 'Há itens para acompanhar abaixo.' },
  critical: { label: 'Problema sério', tone: 'danger', icon: XCircle, text: 'Verifique o servidor o quanto antes.' },
}

const USER_COLORS = (u: User) => u.color
const TONE_BOX = { ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn', danger: 'bg-danger/15 text-danger' }

export default function AdminPage() {
  const status = useAsync(() => api.admin.serverStatus(), [])
  const users = useAsync(() => api.admin.users(), [])
  const activity = useAsync(() => api.activity.recent(8), [])
  const { byId } = useFamily()
  const s = status.data

  if (status.error) {
    return <EmptyState icon={<Server className="size-7" />} title="Não foi possível falar com o servidor" body={status.error} action={<Button onClick={status.reload}>Tentar de novo</Button>} />
  }

  const health = s ? HEALTH[s.health] : null
  const issues = s
    ? [
        ...s.disks.filter((d) => d.health !== 'ok').map((d) => `Disco “${d.label}”: ${d.smart}`),
        ...s.backups.filter((b) => b.status === 'failed').map((b) => `Backup “${b.name}” falhou`),
        ...(users.data ?? []).filter((u) => percent(u.usedBytes, u.quotaBytes) >= 90).map((u) => `${u.name} está com o espaço quase cheio`),
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="violet">
              <ShieldCheck className="size-3.5" /> Só o administrador vê esta área
            </Badge>
            <DemoTag />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Administração da família</h1>
          <p className="mt-1 text-sm text-subtle">Visão geral do servidor. Configurações avançadas continuam no OpenMediaVault.</p>
        </div>
      </div>

      {/* Estado geral */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="card relative overflow-hidden p-6">
          {!s || !health ? (
            <Skeleton className="h-40" />
          ) : (
            <>
              <div
                className={cn(
                  'pointer-events-none absolute -top-20 -right-10 size-64 rounded-full blur-3xl',
                  health.tone === 'ok' ? 'bg-ok/20' : health.tone === 'warn' ? 'bg-warn/20' : 'bg-danger/20',
                )}
              />
              <div className="relative flex items-start gap-4">
                <div className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', TONE_BOX[health.tone])}>
                  <health.icon className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-subtle">Estado do servidor</p>
                  <p className="font-display text-2xl font-semibold text-fg">{health.label}</p>
                  <p className="mt-1 text-sm text-muted">
                    <span className="font-mono text-fg">{s.hostname}</span> · ligado há {formatUptime(s.uptimeSec)}
                  </p>
                </div>
              </div>
              {issues.length > 0 && (
                <ul className="relative mt-5 space-y-2">
                  {issues.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 rounded-xl border border-warn/20 bg-warn/8 px-3 py-2 text-sm text-fg">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" /> {i}
                    </li>
                  ))}
                </ul>
              )}
              <div className="relative mt-5 grid grid-cols-3 gap-3">
                <Gauge icon={<Cpu className="size-4" />} label="Processador" value={`${s.cpuPercent}%`} pct={s.cpuPercent} />
                <Gauge icon={<MemoryStick className="size-4" />} label="Memória" value={`${formatBytes(s.ramUsedBytes, 1)}`} sub={`de ${formatBytes(s.ramTotalBytes, 0)}`} pct={percent(s.ramUsedBytes, s.ramTotalBytes)} />
                {s.cpuTempC !== undefined && s.cpuTempC !== null ? (
                  <Gauge icon={<Thermometer className="size-4" />} label="Temperatura" value={`${s.cpuTempC} °C`} pct={(s.cpuTempC / 90) * 100} warnAt={70} raw={s.cpuTempC} />
                ) : (
                  <Gauge icon={<Thermometer className="size-4" />} label="Temperatura" value="—" sub="sem sensor" pct={0} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Capacidade */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <HardDrive className="size-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-fg">Capacidade total</h2>
              <p className="text-sm text-subtle">Somando os discos de dados</p>
            </div>
          </div>
          {s && users.data ? (
            <>
              <div className="flex items-baseline justify-between">
                <p className="font-display text-3xl font-semibold text-fg">{formatBytes(s.usedBytes)}</p>
                <p className="text-sm text-subtle">de {formatBytes(s.totalBytes, 0)}</p>
              </div>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-3">
                {users.data.map((u) => (
                  <div key={u.id} title={`${u.name}: ${formatBytes(u.usedBytes)}`} style={{ width: `${(u.usedBytes / s.totalBytes) * 100}%`, background: USER_COLORS(u) }} />
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {users.data.map((u) => (
                  <li key={u.id} className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 rounded-full" style={{ background: u.color }} />
                    <span className="truncate text-muted">{u.name}</span>
                    <span className="ml-auto text-xs text-subtle tabular-nums">{formatBytes(u.usedBytes, 0)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-ok">{formatBytes(s.totalBytes - s.usedBytes)} livres no servidor</p>
            </>
          ) : (
            <Skeleton className="h-36" />
          )}
        </div>
      </section>

      {/* Usuários */}
      <section className="card overflow-hidden">
        <SectionHeader icon={<Users className="size-5" />} title="Familiares cadastrados" subtitle={users.data ? `${users.data.length} contas` : undefined} />
        <div className="hidden grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1.2fr)_120px] gap-4 border-y border-line px-6 py-2.5 text-xs font-semibold tracking-wide text-subtle uppercase md:grid">
          <span>Pessoa</span>
          <span>Tipo</span>
          <span>Espaço usado</span>
          <span>Último acesso</span>
        </div>
        <ul className="divide-y divide-line border-t border-line md:border-t-0">
          {(users.data ?? []).map((u) => {
            const p = percent(u.usedBytes, u.quotaBytes)
            return (
              <li key={u.id} className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1.2fr)_120px] md:items-center md:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar user={u} size={38} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{u.name}</p>
                    <p className="truncate text-xs text-subtle">{u.email}</p>
                  </div>
                </div>
                <div>
                  <Badge tone={u.role === 'admin' ? 'violet' : 'neutral'}>{u.role === 'admin' ? 'Administrador' : 'Familiar'}</Badge>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted">
                      {formatBytes(u.usedBytes)} de {formatBytes(u.quotaBytes, 0)}
                    </span>
                    <span className={cn('font-semibold', p >= 90 ? 'text-danger' : p >= 75 ? 'text-warn' : 'text-subtle')}>{p}%</span>
                  </div>
                  <ProgressBar value={p} tone={p >= 90 ? 'danger' : p >= 75 ? 'warn' : 'brand'} />
                </div>
                <p className="text-sm text-muted">{u.lastSeenAt ? timeAgo(u.lastSeenAt) : '—'}</p>
              </li>
            )
          })}
          {users.loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-6 py-4">
                <Skeleton className="h-10" />
              </li>
            ))}
        </ul>
      </section>

      {/* Discos e backups */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <SectionHeader icon={<HardDrive className="size-5" />} title="Discos" subtitle="Saúde (SMART), uso e temperatura" />
          <ul className="space-y-3 px-6 pb-6">
            {s?.disks.map((d) => {
              const p = percent(d.usedBytes, d.sizeBytes)
              const h = HEALTH[d.health]
              return (
                <li key={d.id} className="rounded-2xl border border-line bg-surface-2/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg">{d.label}</p>
                      <p className="truncate text-xs text-subtle">{d.model}</p>
                    </div>
                    <Badge tone={h.tone}>
                      <h.icon className="size-3.5" /> {d.smart.split(' — ')[0]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={p} className="flex-1" tone={p >= 90 ? 'danger' : p >= 80 ? 'warn' : 'brand'} />
                    <span className="w-28 text-right text-xs text-muted tabular-nums">
                      {formatBytes(d.usedBytes, 0)} / {formatBytes(d.sizeBytes, 0)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    {d.temperatureC !== undefined && d.temperatureC !== null ? (
                      <span className={cn('flex items-center gap-1', d.temperatureC >= 50 ? 'text-warn' : 'text-subtle')}>
                        <Thermometer className="size-3.5" /> {d.temperatureC} °C
                      </span>
                    ) : (
                      <span className="text-subtle">{d.smart}</span>
                    )}
                    {d.health !== 'ok' && <span className="text-warn">{d.smart}</span>}
                  </div>
                </li>
              )
            }) ?? <Skeleton className="h-48" />}
          </ul>
        </div>

        <div className="card">
          <SectionHeader icon={<DatabaseBackup className="size-5" />} title="Backups" subtitle="Cópias de segurança automáticas" />
          <ul className="space-y-3 px-6 pb-6">
            {!s && <Skeleton className="h-48" />}
            {s?.backups.map((b) => <BackupRow key={b.id} b={b} />)}
            {s && s.backups.length === 0 && (
              <li className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">
                Nenhuma cópia de segurança configurada ainda. Ligue um HD externo e configure o backup no OpenMediaVault.
              </li>
            )}
          </ul>
          <p className="border-t border-line px-6 py-4 text-xs text-subtle">
            Dica: a regra 3-2-1 recomenda uma cópia fora de casa. Configure no OpenMediaVault e o status aparece aqui.
          </p>
        </div>
      </section>

      {/* Atividade */}
      <section className="card">
        <SectionHeader icon={<ActivityIcon className="size-5" />} title="Atividade recente da família" />
        <ul className="divide-y divide-line border-t border-line">
          {activity.data?.map((a) => {
            const u = byId(a.userId)
            return (
              <li key={a.id} className="flex items-center gap-3 px-6 py-3">
                <Avatar user={u} size={30} />
                <p className="min-w-0 flex-1 truncate text-sm text-muted">
                  {a.text ? <span className="text-fg">{a.text}</span> : <><span className="font-semibold text-fg">{u?.name}</span> — {a.type === 'login' ? 'entrou' : a.type === 'upload' ? 'enviou' : a.type === 'share' ? 'compartilhou' : a.type === 'delete' ? 'apagou' : a.type === 'rename' ? 'renomeou' : a.type === 'folder' ? 'criou' : a.type === 'restore' ? 'recuperou' : 'favoritou'} {a.target}</>}
                </p>
                <span className="shrink-0 text-xs text-subtle">{timeAgo(a.at)}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <p className="flex items-center justify-center gap-1.5 pb-4 text-center text-xs text-subtle">
        <ExternalLink className="size-3.5" /> Criar contas, mudar cotas e configurar discos: use o OpenMediaVault/Nextcloud como administrador.
      </p>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 p-6 pb-4">
      <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</div>
      <div>
        <h2 className="font-display font-semibold text-fg">{title}</h2>
        {subtitle && <p className="text-sm text-subtle">{subtitle}</p>}
      </div>
    </div>
  )
}

function Gauge({ icon, label, value, sub, pct, warnAt, raw }: { icon: ReactNode; label: string; value: string; sub?: string; pct: number; warnAt?: number; raw?: number }) {
  const warn = warnAt !== undefined && raw !== undefined ? raw >= warnAt : pct >= 85
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="flex items-center gap-1.5 text-xs text-subtle">
        {icon} <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 font-display text-lg font-semibold text-fg">
        {value} {sub && <span className="text-xs font-normal text-subtle">{sub}</span>}
      </p>
      <ProgressBar value={pct} tone={warn ? 'warn' : 'brand'} className="mt-2 h-1.5" />
    </div>
  )
}

function BackupRow({ b }: { b: BackupInfo }) {
  const map = {
    success: { tone: 'ok' as const, label: 'Concluído', icon: CheckCircle2 },
    running: { tone: 'brand' as const, label: 'Em andamento', icon: Loader2 },
    failed: { tone: 'danger' as const, label: 'Falhou', icon: XCircle },
  }[b.status]
  return (
    <li className="rounded-2xl border border-line bg-surface-2/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-fg">{b.name}</p>
          <p className="truncate text-xs text-subtle">→ {b.destination}</p>
        </div>
        <Badge tone={map.tone}>
          <map.icon className={cn('size-3.5', b.status === 'running' && 'animate-spin')} /> {map.label}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Clock className="size-3.5 text-subtle" /> Último: {timeAgo(b.lastRunAt)}
        </span>
        <span>Próximo: {formatDateTime(b.nextRunAt)}</span>
        {b.sizeBytes > 0 && <span>{formatBytes(b.sizeBytes)}</span>}
      </div>
    </li>
  )
}
