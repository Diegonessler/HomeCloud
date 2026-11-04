import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePref = 'dark' | 'light' | 'system'
export type Density = 'comfortable' | 'compact'

interface ThemeState {
  pref: ThemePref
  resolved: 'dark' | 'light'
  setPref: (p: ThemePref) => void
  reduceMotion: boolean
  setReduceMotion: (v: boolean) => void
}

const ThemeContext = createContext<ThemeState | null>(null)
const KEY = 'hc.theme'
const MOTION_KEY = 'hc.reduceMotion'

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}
function write(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* preferências só nesta sessão */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => read<ThemePref>(KEY, 'dark'))
  const [reduceMotion, setReduceMotionState] = useState(() => read<string>(MOTION_KEY, 'false') === 'true')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const fn = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const resolved: 'dark' | 'light' = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#070b1a' : '#f3f5fc')
  }, [resolved])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
  }, [reduceMotion])

  const value = useMemo<ThemeState>(
    () => ({
      pref,
      resolved,
      setPref: (p) => {
        setPrefState(p)
        write(KEY, p)
      },
      reduceMotion,
      setReduceMotion: (v) => {
        setReduceMotionState(v)
        write(MOTION_KEY, String(v))
      },
    }),
    [pref, resolved, reduceMotion],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>')
  return ctx
}
