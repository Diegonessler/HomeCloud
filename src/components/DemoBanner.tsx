import { useState } from 'react'
import { FlaskConical, X } from 'lucide-react'
import { IS_DEMO } from '../services/config'

/** Aviso fixo e honesto: enquanto não há servidor conectado, tudo é demonstrativo. */
export function DemoBanner() {
  const [hidden, setHidden] = useState(false)
  if (!IS_DEMO || hidden) return null
  return (
    <div className="flex items-center gap-3 border-b border-warn/20 bg-warn/8 px-4 py-2 text-[13px] text-fg sm:px-6">
      <FlaskConical className="size-4 shrink-0 text-warn" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Modo demonstração.</span>{' '}
        <span className="text-muted">
          Os arquivos e números são fictícios. Envios, exclusões e compartilhamentos acontecem só nesta tela e não chegam ao servidor.
        </span>
      </p>
      <button onClick={() => setHidden(true)} className="rounded-lg p-1 text-subtle hover:text-fg" aria-label="Ocultar aviso">
        <X className="size-4" />
      </button>
    </div>
  )
}

export function DemoTag({ className = '' }: { className?: string }) {
  if (!IS_DEMO) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-warn/12 px-2 py-0.5 text-[11px] font-semibold text-warn ${className}`}>
      <FlaskConical className="size-3" /> Demonstração
    </span>
  )
}
