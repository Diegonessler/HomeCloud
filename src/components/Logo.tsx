import { useId } from 'react'
import { svgId } from '../lib/cn'
import { cn } from '../lib/cn'

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = svgId(useId())
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id={`${id}l`} cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id}b)`} />
      <rect width="512" height="512" rx="128" fill={`url(#${id}l)`} />
      <path
        d="M168 352h184c39.8 0 72-31 72-69.5 0-35.6-27.8-65-63.6-69C351 165 309 128 258 128c-42.6 0-79 25.7-93.8 62.3C123.5 194.7 92 228 92 268c0 46.4 34 84 76 84z"
        fill="#fff"
      />
      <path d="M256 214l-54 44v54h36v-34h36v34h36v-54z" fill="#5b5ff0" />
    </svg>
  )
}

export function Logo({ className, size = 34, compact }: { className?: string; size?: number; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} className="drop-shadow-[0_6px_18px_rgb(91_140_255/0.45)]" />
      {!compact && (
        <span className="font-display text-[19px] font-semibold tracking-tight text-fg">
          Home<span className="text-gradient">Cloud</span>
        </span>
      )}
    </div>
  )
}
