import { useId } from 'react'
import { svgId } from '../lib/cn'

// Ilustração abstrata da tela de login: uma nuvem de vidro sobre camadas de armazenamento,
// conectada por linhas de dados com brilho azul e roxo.
export function CloudIllustration({ className }: { className?: string }) {
  // ids únicos: a ilustração pode aparecer duas vezes na página (versão celular oculta)
  const u = svgId(useId())
  return (
    <svg viewBox="0 0 520 520" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${u}-halo`} cx="50%" cy="45%" r="50%">
          <stop offset="0" stopColor="#6d5dfc" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}-cloud`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={`${u}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#93c5fd" />
          <stop offset="1" stopColor="#c4b5fd" />
        </linearGradient>
        <linearGradient id={`${u}-disk`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2b3b7a" />
          <stop offset="1" stopColor="#3b2a7a" />
        </linearGradient>
        <linearGradient id={`${u}-line`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0" />
          <stop offset="0.5" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <filter id={`${u}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <circle cx="260" cy="230" r="240" fill={`url(#${u}-halo)`} />

      {/* órbitas */}
      <g fill="none" stroke={`url(#${u}-edge)`} strokeOpacity="0.22">
        <ellipse cx="260" cy="250" rx="220" ry="70" />
        <ellipse cx="260" cy="250" rx="170" ry="52" strokeDasharray="2 8" strokeOpacity="0.4" />
      </g>
      <circle cx="78" cy="268" r="4" fill="#93c5fd">
        <animate attributeName="opacity" values="1;0.3;1" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="452" cy="222" r="3" fill="#c4b5fd">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3.6s" repeatCount="indefinite" />
      </circle>

      {/* camadas de armazenamento */}
      <g transform="translate(150 330)">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(0 ${i * 34})`}>
            <rect width="220" height="26" rx="13" fill={`url(#${u}-disk)`} stroke={`url(#${u}-edge)`} strokeOpacity="0.6" />
            <circle cx="22" cy="13" r="4" fill={i === 1 ? '#a78bfa' : '#60a5fa'}>
              <animate attributeName="opacity" values="1;0.35;1" dur={`${2 + i * 0.7}s`} repeatCount="indefinite" />
            </circle>
            <rect x="40" y="10" width={90 - i * 18} height="6" rx="3" fill="#ffffff" opacity="0.14" />
          </g>
        ))}
      </g>

      {/* linhas de dados */}
      <g stroke={`url(#${u}-line)`} strokeWidth="2" strokeLinecap="round">
        <line x1="215" y1="262" x2="215" y2="330">
          <animate attributeName="y1" values="262;300;262" dur="2.4s" repeatCount="indefinite" />
        </line>
        <line x1="260" y1="270" x2="260" y2="330" />
        <line x1="305" y1="262" x2="305" y2="330">
          <animate attributeName="y1" values="300;262;300" dur="2.8s" repeatCount="indefinite" />
        </line>
      </g>

      {/* nuvem de vidro */}
      <g>
        <path
          d="M178 272h170c38 0 68-28 68-63 0-32-25-58-58-62-10-46-50-80-98-80-40 0-74 24-88 58-38 4-68 34-68 72 0 41 33 75 74 75z"
          fill="#7c6cff"
          opacity="0.22"
          filter={`url(#${u}-blur)`}
        />
        <path
          d="M178 272h170c38 0 68-28 68-63 0-32-25-58-58-62-10-46-50-80-98-80-40 0-74 24-88 58-38 4-68 34-68 72 0 41 33 75 74 75z"
          fill={`url(#${u}-cloud)`}
          stroke={`url(#${u}-edge)`}
          strokeWidth="2"
          strokeOpacity="0.95"
        />
        {/* casa (o "home" do HomeCloud) */}
        <path d="M260 160l-40 32v44h26v-24h28v24h26v-44z" fill="none" stroke="#e0e7ff" strokeWidth="5" strokeLinejoin="round" opacity="0.9" />
      </g>
    </svg>
  )
}
