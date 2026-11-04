import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  icon?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

export function Modal({ open, onClose, title, description, icon, children, footer, size = 'sm' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, textarea, select, [data-autofocus]')
      ;(first ?? panelRef.current)?.focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-[#030612]/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'card relative max-h-[92dvh] w-full animate-scale-in overflow-y-auto rounded-b-none bg-surface p-5 outline-none sm:rounded-b-[1.25rem] sm:p-6',
          SIZES[size],
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
        {(title || icon) && (
          <div className="mb-4 flex items-start gap-3 pr-8">
            {icon && <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">{icon}</div>}
            <div>
              {title && <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl p-2 text-subtle transition hover:bg-surface-2 hover:text-fg"
          aria-label="Fechar"
        >
          <X className="size-5" />
        </button>
        {children}
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
