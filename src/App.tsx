import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom'
import { applyManifestForPath } from './lib/pwa'
import { endSession, getSession } from './lib/auth'
import { getModeFor, type ThemeMode } from './lib/shopTheme'
import { BookingClientView } from './components/BookingClientView'
import { AdminDashboard } from './components/AdminDashboard'
import { BarberAuth } from './components/BarberAuth'
import { MasterAdminDashboard } from './components/MasterAdminDashboard'
import {
  demoBarbershop,
  demoBarbershopsList,
  demoBarbers,
  demoServices,
  demoAppointments,
  demoWorkingHours
} from './lib/mockData'
import type { Appointment, Service, Barbershop, Barber } from './types'

function BookingRouteWrapper({
  barbershop,
  barbershopsList,
  services,
  barbers,
  themeOverride,
  onToggleTheme,
  onNewBooking
}: {
  barbershop: Barbershop
  barbershopsList: Barbershop[]
  services: Service[]
  barbers: Barber[]
  themeOverride: ThemeMode | null
  onToggleTheme: (current: ThemeMode) => void
  onNewBooking: (b: any) => void
}) {
  const { slug } = useParams()

  // Procura barbearia correspondente na lista pelo slug ou usa a atual
  const matchedShop = slug ? barbershopsList.find((s) => s.slug === slug) : null

  const currentShop: Barbershop = matchedShop || {
    ...barbershop,
    slug: slug || barbershop.slug,
    name: slug && slug !== barbershop.slug
      ? slug.replace(/-/g, ' ').toUpperCase()
      : barbershop.name
  }

  // Filtrar serviços específicos desta barbearia
  const shopServices = services.filter((s) => s.barbershop_id === currentShop.id)
  const shopBarbers = barbers.filter((b) => b.barbershop_id === currentShop.id && b.active)
  const mode = getModeFor(currentShop.style_preset, themeOverride)

  return (
    <div className="relative">
      <BookingClientView
        barbershop={currentShop}
        services={shopServices}
        barbers={shopBarbers}
        theme={mode}
        onToggleTheme={() => onToggleTheme(mode)}
        onNewBooking={onNewBooking}
      />
    </div>
  )
}

function AdminRouteWrapper({
  barbershop,
  appointments,
  services,
  barbers,
  workingHours,
  themeOverride,
  onToggleTheme,
  onUpdateAppointments,
  onUpdateServices,
  onUpdateBarbers,
  onUpdateBarbershop,
  onDeleteBarbershop,
  onUpdateWorkingHours
}: {
  barbershop: Barbershop
  appointments: Appointment[]
  services: Service[]
  barbers: Barber[]
  workingHours: import('./types').WorkingHour[]
  themeOverride: ThemeMode | null
  onToggleTheme: (current: ThemeMode) => void
  onUpdateAppointments: (a: Appointment[]) => void
  onUpdateServices: (s: Service[]) => void
  onUpdateBarbers: (b: Barber[]) => void
  onUpdateBarbershop: (b: Barbershop) => void
  onDeleteBarbershop: (id: string) => void
  onUpdateWorkingHours: (wh: import('./types').WorkingHour[]) => void
}) {
  const navigate = useNavigate()

  // Painel só abre com sessão iniciada
  if (!getSession()) return <Navigate to="/login" replace />

  // Isolamento estrito de agendamentos, serviços e equipe da barbearia atual
  const shopAppointments = appointments.filter((a) => a.barbershop_id === barbershop.id)
  const shopServices = services.filter((s) => s.barbershop_id === barbershop.id)
  const shopBarbers = barbers.filter((b) => b.barbershop_id === barbershop.id)

  return (
    <div className="relative">
      <AdminDashboard
        barbershop={barbershop}
        barbers={shopBarbers}
        services={shopServices}
        appointments={shopAppointments}
        workingHours={workingHours}
        theme={themeOverride ?? 'dark'}
        onToggleTheme={() => onToggleTheme(themeOverride ?? 'dark')}
        onBackToClientView={() => navigate(`/${barbershop.slug}`)}
        onLogout={() => {
          endSession()
          navigate('/login')
        }}
        onUpdateAppointments={(updatedShopApts) => {
          const others = appointments.filter((a) => a.barbershop_id !== barbershop.id)
          onUpdateAppointments([...updatedShopApts, ...others])
        }}
        onUpdateServices={(updatedShopServices) => {
          const others = services.filter((s) => s.barbershop_id !== barbershop.id)
          onUpdateServices([...updatedShopServices, ...others])
        }}
        onUpdateBarbers={(updatedShopBarbers) => {
          const others = barbers.filter((b) => b.barbershop_id !== barbershop.id)
          onUpdateBarbers([...updatedShopBarbers, ...others])
        }}
        onUpdateBarbershop={onUpdateBarbershop}
        onDeleteBarbershop={(id) => {
          onDeleteBarbershop(id)
          navigate('/')
        }}
        onUpdateWorkingHours={onUpdateWorkingHours}
      />
    </div>
  )
}

function ManifestSwitcher() {
  const { pathname } = useLocation()
  useEffect(() => applyManifestForPath(pathname), [pathname])
  return null
}

export function App() {
  // Lista de todas as barbearias cadastradas na plataforma (Visível no Master Admin)
  const [barbershopsList, setBarbershopsList] = useState<Barbershop[]>(() => {
    const saved = localStorage.getItem('barber_shops_list')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return demoBarbershopsList
      }
    }
    return demoBarbershopsList
  })

  // Barbearia ativa no momento (para o barbeiro logado)
  const [currentBarbershop, setCurrentBarbershop] = useState<Barbershop>(() => {
    const savedId = localStorage.getItem('barber_current_shop_id')
    if (savedId) {
      const found = barbershopsList.find((s) => s.id === savedId)
      if (found) return found
    }
    return barbershopsList[0] || demoBarbershop
  })

  // Agendamentos
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('barber_appointments')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return demoAppointments
      }
    }
    return demoAppointments
  })

  // Serviços
  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('barber_services')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return demoServices
      }
    }
    return demoServices
  })

  // Horários de Atendimento Semanal
  const [workingHours, setWorkingHours] = useState<import('./types').WorkingHour[]>(() => {
    const saved = localStorage.getItem('barber_working_hours')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return demoWorkingHours
      }
    }
    return demoWorkingHours
  })

  // Tema Claro / Escuro: sem escolha do usuário, cada estilo usa o seu modo inicial
  const [themeOverride, setThemeOverride] = useState<ThemeMode | null>(() => {
    const saved = localStorage.getItem('barber_theme_user')
    return saved === 'light' || saved === 'dark' ? saved : null
  })

  useEffect(() => {
    const effective = themeOverride ?? 'dark'
    document.documentElement.classList.toggle('light', effective === 'light')
    document.documentElement.classList.toggle('dark', effective === 'dark')
  }, [themeOverride])

  const toggleTheme = (current: ThemeMode) => {
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
    localStorage.setItem('barber_theme_user', next)
    setThemeOverride(next)
  }

  // Sincronização e persistência no LocalStorage
  useEffect(() => {
    localStorage.setItem('barber_shops_list', JSON.stringify(barbershopsList))
  }, [barbershopsList])

  useEffect(() => {
    localStorage.setItem('barber_appointments', JSON.stringify(appointments))
  }, [appointments])

  useEffect(() => {
    localStorage.setItem('barber_services', JSON.stringify(services))
  }, [services])

  useEffect(() => {
    localStorage.setItem('barber_working_hours', JSON.stringify(workingHours))
  }, [workingHours])

  useEffect(() => {
    if (currentBarbershop) {
      localStorage.setItem('barber_current_shop_id', currentBarbershop.id)
    }
  }, [currentBarbershop])

  const handleNewBooking = (booking: any) => {
    setAppointments((prev) => [booking, ...prev])
  }

  // Barbeiros da Plataforma (Equipes das Barbearias)
  const [barbers, setBarbers] = useState<Barber[]>(() => {
    const saved = localStorage.getItem('barber_team')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return demoBarbers
      }
    }
    return demoBarbers
  })

  useEffect(() => {
    localStorage.setItem('barber_team', JSON.stringify(barbers))
  }, [barbers])

  // Cadastro de nova barbearia (Barber Onboarding)
  const handleRegisterBarbershop = (
    newShop: Barbershop,
    newServices: Service[],
    initialTeamNames: string[] = []
  ) => {
    setBarbershopsList((prev) => [newShop, ...prev])
    setCurrentBarbershop(newShop)
    setServices((prev) => [...newServices, ...prev])

    // Cria barbeiro principal do proprietário automaticamente
    const ownerBarber: Barber = {
      id: 'barber-' + Date.now(),
      barbershop_id: newShop.id,
      name: newShop.owner_name || 'Barbeiro Principal',
      avatar_url: newShop.logo_url,
      role: 'Responsável',
      bio: 'Profissional especialista.',
      active: true
    }

    const teamList: Barber[] = [ownerBarber]
    initialTeamNames.forEach((name, idx) => {
      if (name.trim()) {
        teamList.push({
          id: `barber-${Date.now()}-${idx + 1}`,
          barbershop_id: newShop.id,
          name: name.trim(),
          role: 'Profissional',
          bio: '',
          active: true
        })
      }
    })

    setBarbers((prev) => [...teamList, ...prev])
  }

  // Atualização de dados da barbearia ativa (ex: pausas, endereço, etc.)
  const handleUpdateBarbershop = (updatedShop: Barbershop) => {
    setCurrentBarbershop(updatedShop)
    setBarbershopsList((prev) =>
      prev.map((s) => (s.id === updatedShop.id ? updatedShop : s))
    )
  }

  // Exclusão de barbearia pelo barbeiro (com registro de auditoria anti-fraude)
  const handleDeleteBarbershop = (shopId: string) => {
    const shopToDelete = barbershopsList.find((s) => s.id === shopId)
    if (shopToDelete) {
      const cleanPhone = shopToDelete.phone_whatsapp.replace(/\D/g, '')
      const auditRaw = localStorage.getItem('barber_audit_history')
      let auditList: any[] = []
      if (auditRaw) {
        try {
          auditList = JSON.parse(auditRaw)
        } catch {
          auditList = []
        }
      }
      const existing = auditList.find((a) => a.phone === cleanPhone)
      if (existing) {
        existing.deleted_at = new Date().toISOString()
        existing.trial_used = true
      } else {
        auditList.push({
          phone: cleanPhone,
          shop_name: shopToDelete.name,
          created_at: shopToDelete.created_at || new Date().toISOString(),
          deleted_at: new Date().toISOString(),
          trial_used: true
        })
      }
      localStorage.setItem('barber_audit_history', JSON.stringify(auditList))
    }

    const remaining = barbershopsList.filter((s) => s.id !== shopId)
    setBarbershopsList(remaining)
    localStorage.removeItem('barber_current_shop_id')
    endSession()
    if (remaining.length > 0) {
      setCurrentBarbershop(remaining[0])
    } else {
      setCurrentBarbershop(demoBarbershop)
    }
  }

  // Atualização em lote pelo Master Admin
  const handleUpdateBarbershopsList = (updated: Barbershop[]) => {
    setBarbershopsList(updated)
    const updatedCurrent = updated.find((s) => s.id === currentBarbershop.id)
    if (updatedCurrent) {
      setCurrentBarbershop(updatedCurrent)
    }
  }

  return (
    <BrowserRouter>
      <ManifestSwitcher />
      <Routes>
        {/* Rota Padrão: Página de Agendamento da Barbearia Atual */}
        <Route
          path="/"
          element={
            <BookingRouteWrapper
              barbershop={currentBarbershop}
              barbershopsList={barbershopsList}
              services={services}
              barbers={barbers}
              themeOverride={themeOverride}
              onToggleTheme={toggleTheme}
              onNewBooking={handleNewBooking}
            />
          }
        />

        {/* Link enviado ao dono do negócio: entrar ou cadastrar conta */}
        {['/cadastrar', '/cadastro', '/login'].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <BarberAuth
                barbershops={barbershopsList}
                onSelectBarbershop={(shop) => setCurrentBarbershop(shop)}
                onRegisterBarbershop={handleRegisterBarbershop}
              />
            }
          />
        ))}

        {/* Painel Administrativo do Barbeiro */}
        <Route
          path="/admin"
          element={
            <AdminRouteWrapper
              barbershop={currentBarbershop}
              appointments={appointments}
              services={services}
              barbers={barbers}
              workingHours={workingHours}
              themeOverride={themeOverride}
              onToggleTheme={toggleTheme}
              onUpdateAppointments={setAppointments}
              onUpdateServices={setServices}
              onUpdateBarbers={setBarbers}
              onUpdateBarbershop={handleUpdateBarbershop}
              onDeleteBarbershop={handleDeleteBarbershop}
              onUpdateWorkingHours={setWorkingHours}
            />
          }
        />

        {/* Painel Master do Dono da Plataforma (Acesso Secreto Apenas por URL) */}
        <Route
          path="/master"
          element={
            <MasterAdminDashboard
              barbershops={barbershopsList}
              onUpdateBarbershops={handleUpdateBarbershopsList}
            />
          }
        />
        <Route
          path="/superadmin"
          element={
            <MasterAdminDashboard
              barbershops={barbershopsList}
              onUpdateBarbershops={handleUpdateBarbershopsList}
            />
          }
        />

        {/* Link copiado no painel do barbeiro (ex: /b/nk-barbearia) */}
        <Route
          path="/b/:slug"
          element={
            <BookingRouteWrapper
              barbershop={currentBarbershop}
              barbershopsList={barbershopsList}
              services={services}
              barbers={barbers}
              themeOverride={themeOverride}
              onToggleTheme={toggleTheme}
              onNewBooking={handleNewBooking}
            />
          }
        />

        {/* Link Público de cada Barbearia pelo seu Slug (ex: /nk-barbearia) */}
        <Route
          path="/:slug"
          element={
            <BookingRouteWrapper
              barbershop={currentBarbershop}
              barbershopsList={barbershopsList}
              services={services}
              barbers={barbers}
              themeOverride={themeOverride}
              onToggleTheme={toggleTheme}
              onNewBooking={handleNewBooking}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
