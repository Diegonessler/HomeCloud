import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../services'
import type { User } from '../types'

interface AuthState {
  user: User | null
  /** true enquanto verifica se já existe uma sessão */
  booting: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  setUser: (u: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    api.auth.currentUser().then(setUser).finally(() => setBooting(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.auth.login(email, password)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    setUser(await api.auth.currentUser())
  }, [])

  const value = useMemo(() => ({ user, booting, login, logout, refresh, setUser }), [user, booting, login, logout, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
