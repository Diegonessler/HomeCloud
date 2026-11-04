import { useId } from 'react'
import { Play, Clapperboard, Image as ImageIcon } from 'lucide-react'
import type { MediaItem } from '../types'
import { formatDuration } from '../lib/format'
import { cn, svgId } from '../lib/cn'
import { SafeImage } from './SafeImage'
import { IS_DEMO } from '../services/config'

// Paletas de "cenas" ilustrativas usadas como miniaturas no modo demonstração.
// Quando o servidor estiver conectado, aqui entram as prévias reais geradas pelo Nextcloud.
const PALETTES = [
  ['#1e1b4b', '#7c3aed', '#f0abfc', '#3b0764', '#581c87'], // crepúsculo violeta
  ['#0c4a6e', '#38bdf8', '#fde68a', '#075985', '#0e7490'], // praia
  ['#1f2937', '#f97316', '#fde047', '#7c2d12', '#9a3412'], // pôr do sol
  ['#052e16', '#10b981', '#d9f99d', '#064e3b', '#065f46'], // trilha
  ['#172554', '#6366f1', '#c7d2fe', '#1e3a8a', '#312e81'], // noite azul
  ['#4a044e', '#ec4899', '#fbcfe8', '#831843', '#9d174d'], // festa
  ['#422006', '#eab308', '#fef9c3', '#713f12', '#854d0e'], // campo dourado
]

function rnd(seed: number, n: number) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function SceneArt({ seed, className }: { seed: number; className?: string }) {
  const p = PALETTES[seed % PALETTES.length]
  const sunX = 20 + rnd(seed, 1) * 60
  const sunY = 22 + rnd(seed, 2) * 22
  const h1 = 55 + rnd(seed, 3) * 15
  const h2 = 68 + rnd(seed, 4) * 12
  const id = svgId(useId())
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p[0]} />
          <stop offset="0.75" stopColor={p[1]} />
        </linearGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={p[2]} stopOpacity="0.9" />
          <stop offset="1" stopColor={p[2]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}s)`} />
      <circle cx={sunX} cy={sunY} r="22" fill={`url(#${id}g)`} />
      <circle cx={sunX} cy={sunY} r="6" fill={p[2]} opacity="0.95" />
      <path d={`M0 ${h1} C 25 ${h1 - 12}, 45 ${h1 + 6}, 70 ${h1 - 6} S 100 ${h1 - 2}, 100 ${h1} V100 H0Z`} fill={p[3]} opacity="0.85" />
      <path d={`M0 ${h2} C 30 ${h2 - 8}, 55 ${h2 + 10}, 100 ${h2 - 4} V100 H0Z`} fill={p[4]} />
      <path d={`M0 ${h2 + 10} C 35 ${h2 + 4}, 60 ${h2 + 16}, 100 ${h2 + 8} V100 H0Z`} fill={p[0]} opacity="0.55" />
    </svg>
  )
}

/** Substituto neutro quando o servidor ainda não gerou miniatura */
export function MediaPlaceholder({ type }: { type: 'photo' | 'video' }) {
  const Icon = type === 'video' ? Clapperboard : ImageIcon
  return (
    <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_120%,var(--hc-surface-3),var(--hc-surface-2))] text-subtle">
      <Icon className="size-1/4 max-h-10 max-w-10" strokeWidth={1.5} />
    </div>
  )
}

export function PhotoThumb({ item, className, showMeta = true }: { item: MediaItem; className?: string; showMeta?: boolean }) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-3', className)}>
      {item.localPreviewUrl ? (
        item.type === 'video' ? (
          <video src={item.localPreviewUrl} muted className="size-full object-cover" />
        ) : (
          <img src={item.localPreviewUrl} alt={item.name} loading="lazy" className="size-full object-cover" />
        )
      ) : item.previewUrl ? (
        <SafeImage src={item.previewUrl} alt={item.name} className="size-full object-cover" fallback={<MediaPlaceholder type={item.type} />} />
      ) : IS_DEMO ? (
        <SceneArt seed={item.seed} className="size-full" />
      ) : (
        <MediaPlaceholder type={item.type} />
      )}
      {showMeta && item.type === 'video' && (
        <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          <Play className="size-3 fill-white" />
          {item.durationSec ? formatDuration(item.durationSec) : 'Vídeo'}
        </div>
      )}
    </div>
  )
}
