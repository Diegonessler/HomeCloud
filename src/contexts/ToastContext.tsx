import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  title: string
  body?: string
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  success: (title: string, body?: string, action?: Toast['action']) => void
  error: (title: string, body?: string) => void
  info: (title: string, body?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }
const TONES = { success: 'text-ok', error: 'text-danger', info: 'text-brand' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random()
      setToasts((list) => [...list.slice(-3), { ...t, id }])
      setTimeout(() => dismiss(id), t.kind === 'error' ? 6500 : 4500)
    },
    [dismiss],
  )

  const value = useMemo<ToastApi>(
    () => ({
      success: (title, body, action) => push({ kind: 'success', title, body, action }),
      error: (title, body) => push({ kind: 'error', title, body }),
      info: (title, body) => push({ kind: 'info', title, body }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.kind]
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className="card pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 bg-surface-2 p-4"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${TONES[t.kind]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{t.title}</p>
                {t.body && <p className="mt-0.5 text-sm text-muted">{t.body}</p>}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick()
                      dismiss(t.id)
                    }}
                    className="mt-2 text-sm font-semibold text-brand hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded-lg p-1 text-subtle hover:bg-surface-3 hover:text-fg" aria-label="Fechar aviso">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
