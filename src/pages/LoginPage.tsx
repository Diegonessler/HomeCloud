import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, FlaskConical } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/misc'
import { CloudIllustration } from '../components/CloudIllustration'
import { useAuth } from '../contexts/AuthContext'
import { errorMessage } from '../hooks/useAsync'
import { IS_DEMO } from '../services/config'
import { DEMO_PASSWORD, users as demoUsers } from '../services/mock/data'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({})

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs: typeof fieldErr = {}
    if (!email.trim()) errs.email = IS_DEMO ? 'Digite seu e-mail.' : 'Digite seu usuário ou e-mail.'
    else if (IS_DEMO && !/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Esse e-mail parece incompleto.'
    if (!password) errs.password = 'Digite sua senha.'
    setFieldErr(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      const to = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(to, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  function fillDemo(mail: string) {
    setEmail(mail)
    setPassword(DEMO_PASSWORD)
    setError(null)
    setFieldErr({})
  }

  return (
    <AuthLayout>
      <CloudIllustration className="mx-auto -mt-4 mb-2 w-44 lg:hidden" />
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">Bem-vindo de volta</h1>
        <p className="mt-2 text-[15px] text-muted">Entre para ver as fotos, vídeos e documentos da família.</p>
      </div>

      <form onSubmit={submit} noValidate className="mt-8 space-y-4 animate-fade-up [animation-delay:80ms]">
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-fg animate-scale-in">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
            {error}
          </div>
        )}
        <Input
          label={IS_DEMO ? 'E-mail' : 'Usuário ou e-mail'}
          type={IS_DEMO ? 'email' : 'text'}
          autoComplete="email"
          inputMode={IS_DEMO ? 'email' : 'text'}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={IS_DEMO ? 'voce@exemplo.com' : 'ex.: diego'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leading={<Mail className="size-[18px]" />}
          error={fieldErr.email}
        />
        <div>
          <Input
            label="Senha"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leading={<Lock className="size-[18px]" />}
            error={fieldErr.password}
            trailing={
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="rounded-lg p-1.5 text-subtle transition hover:text-fg"
                aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
                aria-pressed={show}
              >
                {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            }
          />
          <div className="mt-2 text-right">
            <Link to="/esqueci-senha" className="text-sm font-semibold text-brand hover:underline">
              Esqueci minha senha
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
          {!loading && <ArrowRight className="size-5" />}
        </Button>
      </form>

      {IS_DEMO && (
        <div className="mt-8 rounded-2xl border border-warn/25 bg-warn/6 p-4 animate-fade-up [animation-delay:160ms]">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <FlaskConical className="size-4 text-warn" /> Contas de demonstração
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Toque em uma para preencher. Senha: <code className="rounded bg-surface-3 px-1.5 py-0.5 text-fg">{DEMO_PASSWORD}</code>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {demoUsers.slice(0, 2).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => fillDemo(u.email)}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-surface/60 p-2.5 text-left transition hover:border-brand/40 hover:bg-surface"
              >
                <Avatar user={u} size={30} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{u.name}</p>
                  <p className="text-xs text-subtle">{u.role === 'admin' ? 'Administrador' : 'Familiar'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
