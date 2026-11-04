import type { ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ShieldAlert, Compass } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { UploadProvider } from './contexts/UploadContext'
import { AppLayout } from './layouts/AppLayout'
import { LogoMark } from './components/Logo'
import { EmptyState } from './components/ui/misc'
import { Button } from './components/ui/Button'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import FilesPage from './pages/FilesPage'
import PhotosPage from './pages/PhotosPage'
import SharedPage from './pages/SharedPage'
import FavoritesPage from './pages/FavoritesPage'
import TrashPage from './pages/TrashPage'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'

// HashRouter quando o app é servido como arquivo único ou sem configuração de rotas no servidor
const useHash = import.meta.env.MODE === 'single' || import.meta.env.VITE_ROUTER === 'hash'
const Router = useHash ? HashRouter : BrowserRouter

function Splash() {
  return (
    <div className="hc-backdrop grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={56} className="animate-float drop-shadow-[0_10px_30px_rgb(91_140_255/0.5)]" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
          <div className="skeleton h-full w-full" />
        </div>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth()
  const location = useLocation()
  if (booting) return <Splash />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}

/**
 * Bloqueio visual da área administrativa.
 * A proteção de verdade precisa estar no backend (que recusa /admin/* para não administradores);
 * este guard só evita mostrar a tela para quem não deve.
 */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'admin')
    return (
      <EmptyState
        icon={<ShieldAlert className="size-7" />}
        title="Área restrita"
        body="Esta página é só para quem administra o servidor da família."
        action={<Button onClick={() => history.back()}>Voltar</Button>}
      />
    )
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth()
  if (booting) return <Splash />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function NotFound() {
  return (
    <EmptyState
      icon={<Compass className="size-7" />}
      title="Página não encontrada"
      body="O endereço pode ter mudado. Use o menu para continuar."
      action={<Button onClick={() => (window.location.hash ? (window.location.hash = '/') : window.location.assign('/'))}>Ir para o início</Button>}
    />
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <UploadProvider>
              <Routes>
                <Route path="/entrar" element={<PublicOnly><LoginPage /></PublicOnly>} />
                <Route path="/esqueci-senha" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
                <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="arquivos" element={<FilesPage />} />
                  <Route path="arquivos/:folderId" element={<FilesPage />} />
                  <Route path="fotos" element={<PhotosPage />} />
                  <Route path="compartilhados" element={<SharedPage />} />
                  <Route path="favoritos" element={<FavoritesPage />} />
                  <Route path="lixeira" element={<TrashPage />} />
                  <Route path="conta" element={<AccountPage />} />
                  <Route path="admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </UploadProvider>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
