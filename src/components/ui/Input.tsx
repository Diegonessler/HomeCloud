import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string | null
  leading?: ReactNode
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leading, trailing, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <div
        className={cn(
          'group flex h-12 items-center gap-2 rounded-xl border bg-surface-2 px-3.5 transition-all focus-within:bg-surface focus-within:ring-4',
          error
            ? 'border-danger/60 focus-within:ring-danger/15'
            : 'border-line-strong focus-within:border-brand/70 focus-within:ring-brand/15',
        )}
      >
        {leading && <span className="text-subtle group-focus-within:text-brand">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${inputId}-msg` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle"
          {...rest}
        />
        {trailing}
      </div>
      {(error || hint) && (
        <p id={`${inputId}-msg`} className={cn('mt-1.5 text-sm', error ? 'text-danger' : 'text-subtle')}>
          {error || hint}
        </p>
      )}
    </div>
  )
})
