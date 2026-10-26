import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { BookingClientView } from './components/BookingClientView'
import { AdminDashboard } from './components/AdminDashboard'
import { BarberOnboarding } from './components/BarberOnboarding'
import {
  demoBarbershop,
  demoBarbers,
  demoServices,
  demoAppointments,
  demoWorkingHours
} from './lib/mockData'
import type { Appointment, Service, Barbershop } from './types'
import { Shield, PlusCircle } from 'lucide-react'

function BookingRouteWrapper({
  barbershop,
  services,
  onNewBooking
}: {
  barbershop: Barbershop
  services: Service[]
  onNewBooking: (b: any) => void
}) {
  const navigate = useNavigate()
  const { slug } = useParams()

  // Permite customizar slug ou usar o padrão nk-barbearia
  const currentShop: Barbershop = {
    ...barbershop,
    slug: slug || barbershop.slug,
    name: slug && slug !== barbershop.slug
      ? slug.replace(/-/g, ' ').toUpperCase()
      : barbershop.name
  }

  return (
    <div className="relative">
      {/* Botões flutuantes para alternar entre Cliente, Admin e Cadastro facilmente em demonstrações */}
      <div className="fixed top-3 left-3 z-50 flex items-center gap-2">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900/90 border border-amber-500/30 text-amber-400 backdrop-blur-md shadow-xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Painel Admin</span>
        </button>

        <button
          onClick={() => navigate('/cadastrar')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900/90 border border-slate-700 text-slate-300 backdrop-blur-md shadow-xl hover:bg-slate-800 hover:text-white transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Criar Barbearia</span>
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
  )
}

export function App() {
  // Carrega barbearia salva ou mock padrão
  const [barbershop, setBarbershop] = useState<Barbershop>(() => {
    const saved = localStorage.getItem('barber_shop')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return demoBarbershop
      }
    }
    return demoBarbershop
  })

  // Carrega agendamentos salvos ou mock padrão
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

  // Carrega serviços salvos ou padrão
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

  // Persiste no localStorage
  useEffect(() => {
    localStorage.setItem('barber_shop', JSON.stringify(barbershop))
  }, [barbershop])

  useEffect(() => {
    localStorage.setItem('barber_appointments', JSON.stringify(appointments))
  }, [appointments])

  useEffect(() => {
    localStorage.setItem('barber_services', JSON.stringify(services))
  }, [services])

  const handleNewBooking = (booking: any) => {
    setAppointments((prev) => [booking, ...prev])
  }

  const handleRegisterBarbershop = (newShop: Barbershop, newServices: Service[]) => {
    setBarbershop(newShop)
    setServices(newServices)
    setAppointments([]) // Nova barbearia começa com agenda limpa
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <BookingRouteWrapper
              barbershop={barbershop}
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
              barbershop={barbershop}
              appointments={appointments}
              services={services}
              onUpdateAppointments={setAppointments}
              onUpdateServices={setServices}
            />
          }
        />
        <Route
          path="/:slug"
          element={
            <BookingRouteWrapper
              barbershop={barbershop}
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
