import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, MailCheck, Send } from 'lucide-react'
import { AuthLayout } from '../layouts/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { DemoTag } from '../components/DemoBanner'
import { api } from '../services'
import { errorMessage } from '../hooks/useAsync'
import { IS_DEMO } from '../services/config'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.auth.requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Link to="/entrar" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Voltar para o login
      </Link>

      {sent ? (
        <div className="animate-fade-up">
          <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-ok/15 text-ok">
            <MailCheck className="size-7" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-fg">Pedido enviado</h1>
          <p className="mt-3 text-[15px] text-muted">
            {IS_DEMO
              ? 'Na demonstração nenhum e-mail é enviado de verdade. Com o servidor conectado, chegará um link para criar uma nova senha.'
              : `Se ${email} tiver uma conta, você receberá um link para criar uma nova senha. Não chegou? Fale com quem cuida do servidor da família.`}
          </p>
          <DemoTag className="mt-4" />
          <Button size="lg" className="mt-8 w-full" onClick={() => navigate('/entrar')}>
            Voltar para o login
          </Button>
        </div>
      ) : (
        <div className="animate-fade-up">
          <h1 className="font-display text-3xl font-semibold text-fg">Esqueceu a senha?</h1>
          <p className="mt-2 text-[15px] text-muted">Sem problema. Digite seu e-mail e enviaremos um link para criar uma nova.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leading={<Mail className="size-[18px]" />}
              error={error}
            />
            <Button type="submit" size="lg" className="w-full" loading={loading} icon={<Send className="size-4" />}>
              Enviar link
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  )
}
