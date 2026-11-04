import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

const HIDDEN: CSSProperties = { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  hidden?: boolean
}

/**
 * Menu suspenso acessível (Esc fecha, clique fora fecha).
 * Renderizado em portal com posição fixa, para não ser cortado por cards com overflow.
 */
export function Menu({
  trigger,
  items,
  align = 'right',
  label,
  children,
  panelClassName,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  items?: MenuItem[]
  align?: 'left' | 'right'
  label: string
  children?: (close: () => void) => ReactNode
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>(HIDDEN)
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = () => setOpen(false)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect()
      const p = panelRef.current
      if (!a || !p) return
      const pw = p.offsetWidth
      const ph = p.offsetHeight
      const gap = 8
      let left = align === 'right' ? a.right - pw : a.left
      left = Math.max(8, Math.min(left, window.innerWidth - pw - 8))
      let top = a.bottom + gap
      if (top + ph > window.innerHeight - 8 && a.top - gap - ph > 8) top = a.top - gap - ph
      setStyle({ position: 'fixed', top, left })
    }
    const onScroll = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) {
      setStyle(HIDDEN)
      return
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!anchorRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    setTimeout(() => panelRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus(), 20)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={anchorRef} className="relative" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={label}
            style={style}
            onClick={(e) => e.stopPropagation()}
            className={cn('card z-[75] min-w-52 animate-scale-in bg-surface-2 p-1.5', panelClassName)}
          >
            {children
              ? children(close)
              : items
                  ?.filter((i) => !i.hidden)
                  .map((item) => (
                    <button
                      key={item.label}
                      role="menuitem"
                      onClick={() => {
                        close()
                        item.onSelect()
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition outline-none',
                        item.danger ? 'text-danger hover:bg-danger/10 focus:bg-danger/10' : 'text-fg hover:bg-surface-3 focus:bg-surface-3',
                      )}
                    >
                      <span className={cn('[&>svg]:size-4', item.danger ? '' : 'text-muted')}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
