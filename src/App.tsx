import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { BookingClientView } from './components/BookingClientView'
import { AdminDashboard } from './components/AdminDashboard'
import { BarberOnboarding } from './components/BarberOnboarding'
import { MasterAdminDashboard } from './components/MasterAdminDashboard'
import {
  demoBarbershop,
  demoBarbershopsList,
  demoBarbers,
  demoServices,
  demoAppointments,
  demoWorkingHours
} from './lib/mockData'
import type { Appointment, Service, Barbershop } from './types'

function BookingRouteWrapper({
  barbershop,
  barbershopsList,
  services,
  onNewBooking
}: {
  barbershop: Barbershop
  barbershopsList: Barbershop[]
  services: Service[]
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

  return (
    <div className="relative">
      <BookingClientView
        barbershop={currentShop}
        services={services}
        onNewBooking={onNewBooking}
      />
    </div>
  )
}

function AdminRouteWrapper({
  barbershop,
  appointments,
  services,
  onUpdateAppointments,
  onUpdateServices,
  onUpdateBarbershop,
  onDeleteBarbershop
}: {
  barbershop: Barbershop
  appointments: Appointment[]
  services: Service[]
  onUpdateAppointments: (a: Appointment[]) => void
  onUpdateServices: (s: Service[]) => void
  onUpdateBarbershop: (b: Barbershop) => void
  onDeleteBarbershop: (id: string) => void
}) {
  const navigate = useNavigate()

  return (
    <div className="relative">
      <AdminDashboard
        barbershop={barbershop}
        barbers={demoBarbers}
        services={services}
        appointments={appointments}
        workingHours={demoWorkingHours}
        onBackToClientView={() => navigate(`/${barbershop.slug}`)}
        onUpdateAppointments={onUpdateAppointments}
        onUpdateServices={onUpdateServices}
        onUpdateBarbershop={onUpdateBarbershop}
        onDeleteBarbershop={(id) => {
          onDeleteBarbershop(id)
          navigate('/')
        }}
      />
    </div>
  )
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
    if (currentBarbershop) {
      localStorage.setItem('barber_current_shop_id', currentBarbershop.id)
    }
  }, [currentBarbershop])

  const handleNewBooking = (booking: any) => {
    setAppointments((prev) => [booking, ...prev])
  }

  // Cadastro de nova barbearia (Barber Onboarding)
  const handleRegisterBarbershop = (newShop: Barbershop, newServices: Service[]) => {
    setBarbershopsList((prev) => [newShop, ...prev])
    setCurrentBarbershop(newShop)
    setServices(newServices)
  }

  // Atualização de dados da barbearia ativa (ex: pausas, endereço, etc.)
  const handleUpdateBarbershop = (updatedShop: Barbershop) => {
    setCurrentBarbershop(updatedShop)
    setBarbershopsList((prev) =>
      prev.map((s) => (s.id === updatedShop.id ? updatedShop : s))
    )
  }

  // Exclusão de barbearia pelo barbeiro
  const handleDeleteBarbershop = (shopId: string) => {
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
      <Routes>
        {/* Rota Padrão: Página de Agendamento da Barbearia Atual */}
        <Route
          path="/"
          element={
            <BookingRouteWrapper
              barbershop={currentBarbershop}
              barbershopsList={barbershopsList}
              services={services}
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

        {/* Painel Administrativo do Barbeiro */}
        <Route
          path="/admin"
          element={
            <AdminRouteWrapper
              barbershop={currentBarbershop}
              appointments={appointments}
              services={services}
              onUpdateAppointments={setAppointments}
              onUpdateServices={setServices}
              onUpdateBarbershop={handleUpdateBarbershop}
              onDeleteBarbershop={handleDeleteBarbershop}
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

        {/* Link Público de cada Barbearia pelo seu Slug (ex: /nk-barbearia) */}
        <Route
          path="/:slug"
          element={
            <BookingRouteWrapper
              barbershop={currentBarbershop}
              barbershopsList={barbershopsList}
              services={services}
              onNewBooking={handleNewBooking}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
