import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, KeyRound, Lock, LogOut, Moon, Sun, Monitor, Save, ShieldCheck, UserRound, Palette, HardDrive, CalendarDays, Clock, Server, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme, type ThemePref } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services'
import { errorMessage } from '../hooks/useAsync'
import { useAsync } from '../hooks/useAsync'
import { Avatar, Badge, ProgressBar, Segmented, Switch } from '../components/ui/misc'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { DemoTag } from '../components/DemoBanner'
import { formatBytes, formatDate, percent, timeAgo } from '../lib/format'
import { IS_DEMO } from '../services/config'
import { cn } from '../lib/cn'

export default function AccountPage() {
  const { user, setUser, logout } = useAuth()
  const { pref, setPref, reduceMotion, setReduceMotion } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const storage = useAsync(() => api.files.storage(), [])

  if (!user) return null
  const pct = percent(user.usedBytes, user.quotaBytes)

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('O nome não pode ficar vazio')
    setSavingName(true)
    try {
      setUser(await api.auth.updateProfile({ name: name.trim() }))
      toast.success('Nome atualizado')
    } catch (err) {
      toast.error('Não foi possível salvar', errorMessage(err))
    } finally {
      setSavingName(false)
    }
  }

  async function pickPhoto(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return toast.error('Escolha uma imagem', 'Formatos aceitos: JPG, PNG ou WEBP.')
    const url = URL.createObjectURL(f)
    setUser(await api.auth.updateProfile({ avatarUrl: url }))
    toast.success('Foto atualizada', IS_DEMO ? 'Demonstração: a foto fica só nesta tela.' : undefined)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Minha conta</h1>
        <p className="mt-1 text-sm text-subtle">Seus dados, sua senha e como o HomeCloud aparece para você.</p>
      </div>

      {/* Perfil */}
      <section className="card relative mb-5 overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-brand/25 via-brand-2/20 to-transparent" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative self-start">
            <Avatar user={user} size={96} />
            {IS_DEMO && (
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full bg-gradient-brand text-white shadow-lg ring-4 ring-surface transition hover:scale-105"
              aria-label="Trocar foto de perfil"
            >
              <Camera className="size-4" />
            </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files)} />
          </div>
          <form onSubmit={saveName} className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} leading={<UserRound className="size-[18px]" />} className="flex-1" />
            <Input label="E-mail" value={user.email} readOnly disabled leading={<Mail className="size-[18px]" />} className="flex-1 opacity-80" hint="Para mudar o e-mail, fale com o administrador." />
            <Button type="submit" variant="secondary" loading={savingName} icon={<Save className="size-4" />} className="sm:mb-[26px]" disabled={name.trim() === user.name}>
              Salvar
            </Button>
          </form>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <PasswordCard />

        {/* Preferências */}
        <Card icon={<Palette className="size-5" />} title="Aparência" subtitle="Como o HomeCloud aparece neste aparelho">
          <p className="mb-2 text-sm font-medium text-fg">Tema</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: 'dark', label: 'Escuro', icon: Moon },
                { v: 'light', label: 'Claro', icon: Sun },
                { v: 'system', label: 'Automático', icon: Monitor },
              ] as { v: ThemePref; label: string; icon: typeof Moon }[]
            ).map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setPref(v)}
                aria-pressed={pref === v}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-sm font-medium transition',
                  pref === v ? 'border-brand/60 bg-brand-soft text-fg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
                )}
              >
                <ThemeSwatch mode={v} />
                <span className="flex items-center gap-1.5">
                  <Icon className="size-3.5" /> {label}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-surface-2 p-4">
            <div>
              <p className="text-sm font-medium text-fg">Reduzir animações</p>
              <p className="text-xs text-subtle">Deixa as transições mais discretas.</p>
            </div>
            <Switch checked={reduceMotion} onChange={setReduceMotion} label="Reduzir animações" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-surface-2 p-4">
            <div>
              <p className="text-sm font-medium text-fg">Exibição de arquivos</p>
              <p className="text-xs text-subtle">Pode trocar a qualquer momento em Meus arquivos.</p>
            </div>
            <ViewPref />
          </div>
        </Card>

        {/* Espaço */}
        <Card icon={<HardDrive className="size-5" />} title="Seu espaço" subtitle="Quanto você usa da nuvem da família" right={<DemoTag />}>
          <div className="flex items-baseline justify-between">
            <p className="font-display text-3xl font-semibold text-fg">{formatBytes(user.usedBytes)}</p>
            <p className="text-sm text-subtle">de {formatBytes(user.quotaBytes, 0)}</p>
          </div>
          <ProgressBar value={pct} tone={pct >= 90 ? 'danger' : pct >= 75 ? 'warn' : 'brand'} className="mt-3 h-2.5" />
          <p className="mt-2 text-sm text-muted">Ainda cabem {formatBytes(user.quotaBytes - user.usedBytes)} — algo como {Math.round((user.quotaBytes - user.usedBytes) / (3 * 1024 ** 2)).toLocaleString('pt-BR')} fotos de celular.</p>
          {storage.data && (
            <ul className="mt-4 space-y-2">
              {storage.data.breakdown.map((b) => (
                <li key={b.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{b.label}</span>
                  <span className="font-medium text-fg tabular-nums">{formatBytes(b.bytes)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Informações */}
        <Card icon={<ShieldCheck className="size-5" />} title="Informações da conta">
          <dl className="space-y-3 text-sm">
            <Row icon={<ShieldCheck className="size-4" />} label="Tipo de conta" value={<Badge tone={user.role === 'admin' ? 'violet' : 'brand'}>{user.role === 'admin' ? 'Administrador' : 'Familiar'}</Badge>} />
            <Row icon={<CalendarDays className="size-4" />} label="Membro desde" value={formatDate(user.createdAt)} />
            <Row icon={<Clock className="size-4" />} label="Último acesso" value={user.lastSeenAt ? timeAgo(user.lastSeenAt) : '—'} />
            <Row icon={<Server className="size-4" />} label="Servidor" value={IS_DEMO ? 'Demonstração (sem servidor)' : 'Servidor da família'} />
          </dl>
          <Button
            variant="secondary"
            className="mt-6 w-full text-danger"
            icon={<LogOut className="size-4" />}
            onClick={async () => {
              await logout()
              navigate('/entrar')
            }}
          >
            Sair desta conta
          </Button>
        </Card>
      </div>
    </div>
  )
}

function PasswordCard() {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = [next.length >= 8, /[A-Z]/.test(next) && /[a-z]/.test(next), /\d/.test(next), /[^A-Za-z0-9]/.test(next)].filter(Boolean).length
  const strengthLabel = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][strength]

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (next !== confirm) return setError('As duas senhas novas não são iguais.')
    setLoading(true)
    try {
      await api.auth.changePassword(current, next)
      toast.success('Senha alterada', IS_DEMO ? 'Demonstração: nenhuma senha real foi alterada.' : 'Use a nova senha no próximo acesso.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card icon={<KeyRound className="size-5" />} title="Alterar senha" subtitle="Use pelo menos 8 caracteres">
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Senha atual" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} leading={<Lock className="size-[18px]" />} />
        <div>
          <Input label="Nova senha" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} leading={<KeyRound className="size-[18px]" />} />
          {next && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn('h-1.5 flex-1 rounded-full transition', i < strength ? (strength <= 1 ? 'bg-danger' : strength === 2 ? 'bg-warn' : 'bg-ok') : 'bg-surface-3')} />
                ))}
              </div>
              <span className="text-xs text-subtle">{strengthLabel}</span>
            </div>
          )}
        </div>
        <Input label="Repita a nova senha" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} leading={<KeyRound className="size-[18px]" />} error={error} />
        <Button type="submit" className="w-full" loading={loading} disabled={!current || !next || !confirm}>
          Alterar senha
        </Button>
      </form>
    </Card>
  )
}

function ViewPref() {
  const [v, setV] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('hc.view') as 'grid' | 'list') || 'grid'
    } catch {
      return 'grid'
    }
  })
  return (
    <Segmented
      label="Exibição de arquivos"
      value={v}
      onChange={(x) => {
        setV(x)
        try {
          localStorage.setItem('hc.view', x)
        } catch {
          /* ok */
        }
      }}
      options={[
        { value: 'grid', label: 'Grade' },
        { value: 'list', label: 'Lista' },
      ]}
    />
  )
}

function ThemeSwatch({ mode }: { mode: ThemePref }) {
  const dark = <div className="h-full flex-1 bg-[#0b1230] p-1.5"><div className="h-1.5 w-2/3 rounded bg-[#5b8cff]" /><div className="mt-1 h-1.5 w-1/2 rounded bg-[#2a3563]" /></div>
  const light = <div className="h-full flex-1 bg-[#eef1fb] p-1.5"><div className="h-1.5 w-2/3 rounded bg-[#3d6dfa]" /><div className="mt-1 h-1.5 w-1/2 rounded bg-[#cfd6ee]" /></div>
  return <div className="flex h-12 w-full overflow-hidden rounded-xl ring-1 ring-line-strong">{mode === 'dark' ? dark : mode === 'light' ? light : (<>{dark}{light}</>)}</div>
}

function Card({ icon, title, subtitle, children, right }: { icon: ReactNode; title: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card animate-fade-up p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</div>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-fg">{title}</h2>
          {subtitle && <p className="text-sm text-subtle">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-3.5 py-3">
      <dt className="flex items-center gap-2.5 text-muted">
        <span className="text-subtle">{icon}</span>
        {label}
      </dt>
      <dd className="text-right font-medium text-fg">{value}</dd>
    </div>
  )
}
