import { useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

/** Imagem do servidor que troca por um substituto se a miniatura não existir ou falhar. */
export function SafeImage({ src, alt = '', className, fallback, loading = 'lazy' }: { src: string; alt?: string; className?: string; fallback: ReactNode; loading?: 'lazy' | 'eager' }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (failed) return <>{fallback}</>
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn('transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', className)}
    />
  )
}
