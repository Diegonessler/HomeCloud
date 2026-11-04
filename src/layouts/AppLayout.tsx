import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CloudUpload } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { NAV } from './nav'
import { DemoBanner } from '../components/DemoBanner'
import { useUploads } from '../contexts/UploadContext'
import { cn } from '../lib/cn'

export function AppLayout() {
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const { openUpload } = useUploads()

  useEffect(() => {
    setDrawer(false)
    document.getElementById('main')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const mobileNav = NAV.filter((n) => 'mobile' in n && n.mobile)

  return (
    <div className="hc-backdrop min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>

      {/* Menu lateral fixo (desktop) */}
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-line bg-bg-2/70 backdrop-blur-xl lg:block">
        <Sidebar />
      </div>

      {/* Menu lateral em gaveta (celular/tablet) */}
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-[#030612]/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[300px] animate-[fade-up_.3s_ease] border-r border-line bg-bg-2">
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-[272px]">
        <DemoBanner />
        <Topbar onOpenMenu={() => setDrawer(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior (celular) */}
      <nav
        aria-label="Navegação rápida"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-2/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-center px-2">
          {mobileNav.slice(0, 2).map((n) => (
            <MobileLink key={n.to} {...n} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => openUpload({ target: location.pathname.startsWith('/fotos') ? 'media' : 'files' })}
              className="-mt-6 grid size-14 place-items-center rounded-2xl bg-gradient-brand text-white shadow-[0_10px_30px_-8px_rgb(91_140_255/0.8)] transition active:scale-95"
              aria-label="Enviar arquivos"
            >
              <CloudUpload className="size-6" />
            </button>
          </div>
          {mobileNav.slice(2, 4).map((n) => (
            <MobileLink key={n.to} {...n} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function MobileLink({ to, label, icon: Icon, ...rest }: (typeof NAV)[number]) {
  const short = 'short' in rest ? rest.short : label
  return (
    <NavLink
      to={to}
      end={'end' in rest}
      className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition', isActive ? 'text-brand' : 'text-subtle')}
    >
      <Icon className="size-[22px]" />
      <span className="max-w-full truncate">{short}</span>
    </NavLink>
  )
}
