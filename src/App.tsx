import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import { applyManifestForPath } from './lib/pwa'
import { BookingClientView } from './components/BookingClientView'
import { AdminDashboard } from './components/AdminDashboard'
import { BarberOnboarding } from './components/BarberOnboarding'
import { BarberLogin } from './components/BarberLogin'
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
  theme,
  onToggleTheme,
  onNewBooking
}: {
  barbershop: Barbershop
  barbershopsList: Barbershop[]
  services: Service[]
  barbers: Barber[]
  theme: 'dark' | 'light'
  onToggleTheme: () => void
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

  return (
    <div className="relative">
      <BookingClientView
        barbershop={currentShop}
        services={shopServices}
        barbers={shopBarbers}
        theme={theme}
        onToggleTheme={onToggleTheme}
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
  theme,
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
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onUpdateAppointments: (a: Appointment[]) => void
  onUpdateServices: (s: Service[]) => void
  onUpdateBarbers: (b: Barber[]) => void
  onUpdateBarbershop: (b: Barbershop) => void
  onDeleteBarbershop: (id: string) => void
  onUpdateWorkingHours: (wh: import('./types').WorkingHour[]) => void
}) {
  const navigate = useNavigate()

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
        theme={theme}
        onToggleTheme={onToggleTheme}
        onBackToClientView={() => navigate(`/${barbershop.slug}`)}
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

  // Tema Claro / Escuro
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('barber_theme') as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('barber_theme', theme)
    if (theme === 'light') {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
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
      avatar_url: newShop.logo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'Master Barber / Responsável',
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
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          role: 'Barbeiro Especialista',
          bio: 'Atendimento de alta qualidade e estilo.',
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
    localStorage.removeItem('barber_current_user')
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
              theme={theme}
              onToggleTheme={toggleTheme}
              onNewBooking={handleNewBooking}
            />
          }
        />

        {/* Link que o João envia para o Barbeiro se cadastrar */}
        <Route
          path="/cadastrar"
          element={
            <BarberOnboarding
              onRegisterBarbershop={handleRegisterBarbershop}
            />
          }
        />
        <Route
          path="/cadastro"
          element={
            <BarberOnboarding
              onRegisterBarbershop={handleRegisterBarbershop}
            />
          }
        />

        {/* Login com WhatsApp e Senha para Barbeiros */}
        <Route
          path="/login"
          element={
            <BarberLogin
              barbershops={barbershopsList}
              onSelectBarbershop={(shop) => setCurrentBarbershop(shop)}
            />
          }
        />

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
              theme={theme}
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
              theme={theme}
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
              theme={theme}
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
