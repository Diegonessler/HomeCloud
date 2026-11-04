import { useId } from 'react'
import { svgId } from '../lib/cn'
import { formatBytes, percent } from '../lib/format'

/** Anel de uso de espaço, com gradiente da marca (amarelo/vermelho quando está quase cheio). */
export function StorageRing({ used, total, size = 140 }: { used: number; total: number; size?: number }) {
  const id = svgId(useId())
  const pct = percent(used, total)
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone = pct >= 90 ? ['#f87171', '#fb7185'] : pct >= 75 ? ['#fbbf24', '#f59e0b'] : ['#5b8cff', '#8b5cf6']

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id}>
            <stop offset="0" stopColor={tone[0]} />
            <stop offset="1" stopColor={tone[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hc-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-2xl font-semibold text-fg">{pct}%</p>
          <p className="text-xs text-subtle">de {formatBytes(total, 0)}</p>
        </div>
      </div>
    </div>
  )
}
