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
import { Shield, PlusCircle, Crown } from 'lucide-react'

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
  const navigate = useNavigate()
  const { slug } = useParams()

  // Procura barbearia correspondente na lista pelo slug ou usa atual
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
      {/* Botões flutuantes para alternar entre Cliente, Admin, Cadastro e Painel Master facilmente */}
      <div className="fixed top-3 left-3 z-50 flex items-center gap-2">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900/90 border border-amber-500/30 text-amber-400 backdrop-blur-md shadow-xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Barbeiro</span>
        </button>

        <button
          onClick={() => navigate('/master')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 backdrop-blur-md shadow-xl hover:brightness-105 transition-all active:scale-95 cursor-pointer font-black"
        >
          <Crown className="w-3.5 h-3.5 fill-current" />
          <span>Master SaaS</span>
        </button>

        <button
          onClick={() => navigate('/cadastrar')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900/90 border border-slate-700 text-slate-300 backdrop-blur-md shadow-xl hover:bg-slate-800 hover:text-white transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nova Barbearia</span>
        </button>
      </div>

      <BookingClientView
        barbershop={currentShop}
        barbers={demoBarbers}
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
  onUpdateServices
}: {
  barbershop: Barbershop
  appointments: Appointment[]
  services: Service[]
  onUpdateAppointments: (a: Appointment[]) => void
  onUpdateServices: (s: Service[]) => void
}) {
  const navigate = useNavigate()

  return (
    <div className="relative">
      <div className="fixed top-3 right-3 z-50">
        <button
          onClick={() => navigate('/master')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-xl hover:brightness-105 transition-all cursor-pointer font-black"
        >
          <Crown className="w-3.5 h-3.5 fill-current" />
          <span>Painel Master</span>
        </button>
      </div>

      <AdminDashboard
        barbershop={barbershop}
        barbers={demoBarbers}
        services={services}
        appointments={appointments}
        workingHours={demoWorkingHours}
        onBackToClientView={() => navigate(`/${barbershop.slug}`)}
        onUpdateAppointments={onUpdateAppointments}
        onUpdateServices={onUpdateServices}
      />
    </div>
  )
}

export function App() {
  // Lista de todas as barbearias (gestão Master)
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

  // Barbearia ativa no momento
  const [currentBarbershop, setCurrentBarbershop] = useState<Barbershop>(() => {
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

  // Persistência
  useEffect(() => {
    localStorage.setItem('barber_shops_list', JSON.stringify(barbershopsList))
  }, [barbershopsList])

  useEffect(() => {
    localStorage.setItem('barber_appointments', JSON.stringify(appointments))
  }, [appointments])

  useEffect(() => {
    localStorage.setItem('barber_services', JSON.stringify(services))
  }, [services])

  const handleNewBooking = (booking: any) => {
    setAppointments((prev) => [booking, ...prev])
  }

  // Cadastro de nova barbearia
  const handleRegisterBarbershop = (newShop: Barbershop, newServices: Service[]) => {
    setBarbershopsList((prev) => [newShop, ...prev])
    setCurrentBarbershop(newShop)
    setServices(newServices)
    setAppointments([])
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
        <Route
          path="/admin"
          element={
            <AdminRouteWrapper
              barbershop={currentBarbershop}
              appointments={appointments}
              services={services}
              onUpdateAppointments={setAppointments}
              onUpdateServices={setServices}
            />
          }
        />
        {/* Painel do Dono da Plataforma (João) */}
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
