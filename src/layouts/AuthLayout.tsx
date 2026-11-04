import type { ReactNode } from 'react'
import { ShieldCheck, Lock, HardDrive } from 'lucide-react'
import { Logo } from '../components/Logo'
import { CloudIllustration } from '../components/CloudIllustration'

/** Layout das telas de acesso: formulário à esquerda, ilustração à direita (some no celular). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="hc-backdrop relative grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative z-10 flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="flex items-center gap-2 text-xs text-subtle">
          <Lock className="size-3.5" /> Seus arquivos ficam no servidor da sua casa — não em empresas de nuvem.
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-line lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_40%,rgb(99_102_241/0.22),transparent_70%),linear-gradient(160deg,#0a1130,#0b0a24_60%,#120a2e)]" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'linear-gradient(rgb(148 163 255 / 0.25) 1px, transparent 1px), linear-gradient(90deg, rgb(148 163 255 / 0.25) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(circle at 50% 45%, black, transparent 70%)',
          }}
        />
        <div className="relative flex h-full flex-col items-center justify-center p-12">
          <CloudIllustration className="w-full max-w-[460px] animate-float" />
          <div className="mt-6 max-w-md text-center">
            <h2 className="font-display text-2xl font-semibold text-white">A nuvem da sua família, em casa.</h2>
            <p className="mt-3 text-[15px] text-[#aab3d9]">Fotos, vídeos e documentos guardados com privacidade, acessíveis de qualquer lugar.</p>
          </div>
          <div className="mt-8 flex gap-3">
            {[
              { icon: ShieldCheck, label: 'Privado' },
              { icon: HardDrive, label: 'No seu servidor' },
              { icon: Lock, label: 'Conexão segura' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[#d6dcff] backdrop-blur">
                <Icon className="size-3.5 text-[#93c5fd]" /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
