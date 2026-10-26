import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { BookingClientView } from './components/BookingClientView'
import { AdminDashboard } from './components/AdminDashboard'
import {
  demoBarbershop,
  demoBarbers,
  demoServices,
  demoAppointments,
  demoWorkingHours
} from './lib/mockData'
import type { Appointment, Service } from './types'
import { Shield } from 'lucide-react'

function BookingRouteWrapper({
  services,
  onNewBooking
}: {
  services: Service[]
  onNewBooking: (b: any) => void
}) {
  const navigate = useNavigate()
  const { slug } = useParams()

  // Permite customizar slug ou usar o padrão nk-barbearia
  const currentShop = {
    ...demoBarbershop,
    slug: slug || demoBarbershop.slug,
    name: slug && slug !== 'nk-barbearia'
      ? slug.replace(/-/g, ' ').toUpperCase()
      : demoBarbershop.name
  }

  return (
    <div className="relative">
      {/* Botão flutuante para alternar entre Cliente e Admin facilmente em demonstrações */}
      <div className="fixed top-3 left-3 z-50">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900/90 border border-amber-500/30 text-amber-400 backdrop-blur-md shadow-xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Painel Admin</span>
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
  appointments,
  services,
  onUpdateAppointments,
  onUpdateServices
}: {
  appointments: Appointment[]
  services: Service[]
  onUpdateAppointments: (a: Appointment[]) => void
  onUpdateServices: (s: Service[]) => void
}) {
  const navigate = useNavigate()

  return (
    <AdminDashboard
      barbershop={demoBarbershop}
      barbers={demoBarbers}
      services={services}
      appointments={appointments}
      workingHours={demoWorkingHours}
      onBackToClientView={() => navigate('/')}
      onUpdateAppointments={onUpdateAppointments}
      onUpdateServices={onUpdateServices}
    />
  )
}

export function App() {
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
    localStorage.setItem('barber_appointments', JSON.stringify(appointments))
  }, [appointments])

  useEffect(() => {
    localStorage.setItem('barber_services', JSON.stringify(services))
  }, [services])

  const handleNewBooking = (booking: any) => {
    setAppointments((prev) => [booking, ...prev])
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <BookingRouteWrapper
              services={services}
              onNewBooking={handleNewBooking}
            />
          }
        />
        <Route
          path="/:slug"
          element={
            <BookingRouteWrapper
              services={services}
              onNewBooking={handleNewBooking}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRouteWrapper
              appointments={appointments}
              services={services}
              onUpdateAppointments={setAppointments}
              onUpdateServices={setServices}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
