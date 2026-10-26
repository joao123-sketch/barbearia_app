import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom'
import { BookingClientView, type BookingInput } from './components/BookingClientView'
import { AdminDashboard } from './components/AdminDashboard'
import { BarberAuth } from './components/BarberAuth'
import { ResetPassword } from './components/ResetPassword'
import { MasterAdminDashboard } from './components/MasterAdminDashboard'
import { applyManifestForPath } from './lib/pwa'
import { signOut, useSession } from './lib/auth'
import { getModeFor, type ThemeMode } from './lib/shopTheme'
import { useOwnerData } from './lib/useOwnerData'
import { createPublicAppointment, fetchBusySlots, fetchPublicShopBySlug, fetchShopCatalog } from './lib/db'
import type { Barber, Barbershop, Service, WorkingHour } from './types'

type OwnerData = ReturnType<typeof useOwnerData>

function FullScreenMessage({ title, text }: { title: string; text?: string }) {
  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="font-bold">{title}</p>
      {text && <p className="text-sm text-slate-400 max-w-xs">{text}</p>}
    </div>
  )
}

// Página pública de agendamento: carrega o negócio pelo link (/b/slug) direto do banco
function BookingPage({
  themeOverride,
  onToggleTheme,
  ownerShopId
}: {
  themeOverride: ThemeMode | null
  onToggleTheme: (current: ThemeMode) => void
  ownerShopId?: string
}) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'notfound' }
    | { status: 'error' }
    | { status: 'ready'; shop: Barbershop; services: Service[]; barbers: Barber[]; hours: WorkingHour[] }
  >({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    ;(async () => {
      try {
        const shop = slug ? await fetchPublicShopBySlug(slug) : null
        if (cancelled) return
        if (!shop) {
          setState({ status: 'notfound' })
          return
        }
        const catalog = await fetchShopCatalog(shop.id)
        if (cancelled) return
        setState({
          status: 'ready',
          shop,
          services: catalog.services.filter((s) => s.active),
          barbers: catalog.barbers.filter((b) => b.active),
          hours: catalog.workingHours
        })
      } catch {
        if (!cancelled) setState({ status: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (state.status === 'loading') return <FullScreenMessage title="Carregando..." />
  if (state.status === 'notfound')
    return <FullScreenMessage title="Página não encontrada" text="Confira se o link está correto com quem te enviou." />
  if (state.status === 'error')
    return <FullScreenMessage title="Não foi possível carregar" text="Verifique sua conexão e tente de novo." />

  const { shop, services, barbers, hours } = state
  const mode = getModeFor(shop.style_preset, themeOverride)

  const createBooking = async (input: BookingInput) => {
    await createPublicAppointment({ shopId: shop.id, ...input })
  }

  return (
    <BookingClientView
      barbershop={shop}
      services={services}
      barbers={barbers}
      workingHours={hours}
      theme={mode}
      onToggleTheme={() => onToggleTheme(mode)}
      loadBusySlots={(date) => fetchBusySlots(shop.id, date)}
      onCreateBooking={createBooking}
      onBackToPanel={ownerShopId === shop.id ? () => navigate('/admin') : undefined}
    />
  )
}

// Painel do dono: exige login e um negócio cadastrado
function AdminRoute({
  owner,
  themeOverride,
  onToggleTheme
}: {
  owner: OwnerData
  themeOverride: ThemeMode | null
  onToggleTheme: (current: ThemeMode) => void
}) {
  const navigate = useNavigate()
  const { session, ready } = useSession()

  if (!ready || (session && owner.loading)) return <FullScreenMessage title="Carregando..." />
  if (!session) return <Navigate to="/login" replace />
  if (!owner.shop) return <Navigate to="/cadastrar" replace />

  const shop = owner.shop
  const mode = getModeFor(shop.style_preset, themeOverride)

  return (
    <AdminDashboard
      barbershop={shop}
      barbers={owner.barbers}
      services={owner.services}
      appointments={owner.appointments}
      workingHours={owner.workingHours}
      platform={owner.platform}
      theme={mode}
      onToggleTheme={() => onToggleTheme(mode)}
      onBackToClientView={() => navigate(`/b/${shop.slug}`)}
      onLogout={async () => {
        await signOut()
        navigate('/login')
      }}
      onUpdateAppointments={owner.updateAppointments}
      onUpdateServices={owner.updateServices}
      onUpdateBarbers={owner.updateBarbers}
      onUpdateBarbershop={owner.updateShop}
      onUpdateWorkingHours={owner.updateWorkingHours}
      onDeleteBarbershop={async () => {
        await owner.removeShop()
        await signOut()
        navigate('/login')
      }}
    />
  )
}

function ManifestSwitcher() {
  const { pathname } = useLocation()
  useEffect(() => applyManifestForPath(pathname), [pathname])
  return null
}

function AppRoutes() {
  const { session, ready } = useSession()
  const owner = useOwnerData(session?.user.id)

  // Tema: sem escolha do usuário, cada estilo usa o seu modo inicial
  const [themeOverride, setThemeOverride] = useState<ThemeMode | null>(() => {
    try {
      const saved = localStorage.getItem('barber_theme_user')
      return saved === 'light' || saved === 'dark' ? saved : null
    } catch {
      return null
    }
  })

  const toggleTheme = (current: ThemeMode) => {
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem('barber_theme_user', next)
    } catch {
      // modo privado: a escolha vale só nesta visita
    }
    setThemeOverride(next)
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Entrar, cadastrar conta e recuperar senha */}
      {['/cadastrar', '/cadastro', '/login'].map((path) => (
        <Route
          key={path}
          path={path}
          element={<BarberAuth hasSession={ready && Boolean(session)} hasShop={Boolean(owner.shop)} shopLoading={owner.loading} onRegistered={owner.reload} />}
        />
      ))}
      <Route path="/redefinir-senha" element={<ResetPassword />} />

      <Route path="/admin" element={<AdminRoute owner={owner} themeOverride={themeOverride} onToggleTheme={toggleTheme} />} />

      {/* Painel geral da plataforma (só o administrador) */}
      <Route path="/master" element={<MasterAdminDashboard />} />
      <Route path="/superadmin" element={<MasterAdminDashboard />} />

      {/* Link público de cada negócio (/b/nome ou /nome) */}
      <Route
        path="/b/:slug"
        element={<BookingPage themeOverride={themeOverride} onToggleTheme={toggleTheme} ownerShopId={owner.shop?.id} />}
      />
      <Route
        path="/:slug"
        element={<BookingPage themeOverride={themeOverride} onToggleTheme={toggleTheme} ownerShopId={owner.shop?.id} />}
      />
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ManifestSwitcher />
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
