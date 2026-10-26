import React, { useState, useMemo, useRef } from 'react'
import {
  Calendar,
  DollarSign,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Phone,
  Settings,
  Scissors,
  Share2,
  Check,
  CreditCard,
  Lock,
  Trash2,
  Edit3,
  AlertTriangle,
  CalendarOff,
  BellRing,
  MessageCircle,
  ChevronRight,
  Camera
} from 'lucide-react'
import type { Barbershop, Barber, Service, Appointment, WorkingHour } from '../types'
import { PWAInstallPrompt } from './PWAInstallPrompt'
import { DEFAULT_PIX_KEY, DEFAULT_PIX_NAME, DEFAULT_PIX_QRCODE } from '../lib/mockData'

const InstagramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

interface AdminDashboardProps {
  barbershop: Barbershop
  barbers: Barber[]
  services: Service[]
  appointments: Appointment[]
  workingHours: WorkingHour[]
  onBackToClientView?: () => void
  onUpdateAppointments?: (appointments: Appointment[]) => void
  onUpdateServices?: (services: Service[]) => void
  onUpdateBarbershop?: (barbershop: Barbershop) => void
  onDeleteBarbershop?: (id: string) => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  barbershop,
  barbers,
  services: initialServices,
  appointments: initialAppointments,
  workingHours,
  onBackToClientView,
  onUpdateAppointments,
  onUpdateServices,
  onUpdateBarbershop,
  onDeleteBarbershop
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'servicos' | 'horarios' | 'perfil'>('agenda')
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [services, setServices] = useState<Service[]>(initialServices)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPixKey, setCopiedPixKey] = useState(false)

  // Filtro de Histórico de Cortes: Hoje | Esta Semana | Este Mês | Geral
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

  // Modais de Serviços
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState<number>(40)
  const [serviceDuration, setServiceDuration] = useState<number>(30)
  const [serviceCategory, setServiceCategory] = useState<'cabelo' | 'barba' | 'combo' | 'especial'>('cabelo')
  const [serviceDesc, setServiceDesc] = useState('')

  // Modal de Agendamento Manual Balcão
  const [showAddBookingModal, setShowAddBookingModal] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newServiceId, setNewServiceId] = useState(services[0]?.id || '')
  const [newTime, setNewTime] = useState('15:00')

  // Modal de Exclusão de Barbearia com trava estrita
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')

  // Gestão de Pausas e Viagens
  const [newPauseDate, setNewPauseDate] = useState('')
  const [newPauseReason, setNewPauseReason] = useState('')

  // Estados para edição cadastral da barbearia (Logo, Instagram, Endereço, etc.)
  const [profileName, setProfileName] = useState(barbershop.name)
  const [profileLogo, setProfileLogo] = useState(barbershop.logo_url)
  const [profileInstagram, setProfileInstagram] = useState(barbershop.instagram || '')
  const [profilePhone, setProfilePhone] = useState(barbershop.phone_whatsapp)
  const [profileAddress, setProfileAddress] = useState(barbershop.address)
  const [profileSlogan, setProfileSlogan] = useState(barbershop.slogan || '')
  const [profileSaved, setProfileSaved] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('A foto da logo deve ter menos de 4MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    let cleanInstagram = profileInstagram.trim()
    if (cleanInstagram) {
      cleanInstagram = cleanInstagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '')
      cleanInstagram = `@${cleanInstagram}`
    }

    const updatedShop: Barbershop = {
      ...barbershop,
      name: profileName.trim() || barbershop.name,
      logo_url: profileLogo || barbershop.logo_url,
      instagram: cleanInstagram || undefined,
      phone_whatsapp: profilePhone.replace(/\D/g, '') || barbershop.phone_whatsapp,
      address: profileAddress.trim() || barbershop.address,
      slogan: profileSlogan.trim() || barbershop.slogan
    }

    if (onUpdateBarbershop) {
      onUpdateBarbershop(updatedShop)
    }
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  // Copiar link público para divulgar
  const publicUrl = `${window.location.origin}/${barbershop.slug}`
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Copiar chave PIX
  const handleCopyPix = () => {
    navigator.clipboard.writeText(barbershop.pix_key || DEFAULT_PIX_KEY)
    setCopiedPixKey(true)
    setTimeout(() => setCopiedPixKey(false), 2000)
  }

  // ===================== CÁLCULO DE DIAS PARA O VENCIMENTO =====================
  const daysUntilDue = useMemo(() => {
    if (!barbershop.next_billing_date) return 99
    const due = new Date(barbershop.next_billing_date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [barbershop.next_billing_date])

  // ===================== FILTRAGEM DINÂMICA DE AGENDAMENTOS =====================
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  const filteredAppointments = useMemo(() => {
    const now = new Date()
    return appointments.filter((apt) => {
      if (historyFilter === 'today') {
        return apt.appointment_date === todayStr
      }
      if (historyFilter === 'week') {
        const aptDate = new Date(apt.appointment_date + 'T00:00:00')
        const diffTime = Math.abs(now.getTime() - aptDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays <= 7
      }
      if (historyFilter === 'month') {
        const currentYearMonth = todayStr.slice(0, 7) // "YYYY-MM"
        return apt.appointment_date.startsWith(currentYearMonth)
      }
      return true // 'all'
    })
  }, [appointments, historyFilter, todayStr])

  // Métricas recalculadas dinamicamente de acordo com o filtro
  const metricsCount = filteredAppointments.length
  const metricsCompletedCount = filteredAppointments.filter((a) => a.status === 'completed' || a.status === 'confirmed').length
  const metricsRevenue = filteredAppointments
    .filter((a) => a.status !== 'cancelled')
    .reduce((acc, curr) => acc + curr.total_price, 0)

  const filterLabel = {
    today: 'hoje',
    week: 'esta semana',
    month: 'este mês',
    all: 'todo o período'
  }[historyFilter]

  // ===================== ATUALIZAÇÃO DE STATUS =====================
  const updateStatus = (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    const updated = appointments.map((apt) =>
      apt.id === id ? { ...apt, status } : apt
    )
    setAppointments(updated)
    if (onUpdateAppointments) onUpdateAppointments(updated)
  }

  // ===================== CADASTRO E EDIÇÃO DE SERVIÇOS =====================
  const handleOpenAddService = () => {
    setEditingService(null)
    setServiceName('')
    setServicePrice(40)
    setServiceDuration(30)
    setServiceCategory('cabelo')
    setServiceDesc('')
    setShowAddServiceModal(true)
  }

  const handleOpenEditService = (service: Service) => {
    setEditingService(service)
    setServiceName(service.name)
    setServicePrice(service.price)
    setServiceDuration(service.duration_minutes)
    setServiceCategory(service.category || 'cabelo')
    setServiceDesc(service.description || '')
    setShowAddServiceModal(true)
  }

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceName.trim()) return

    if (editingService) {
      // Edição
      const updated = services.map((s) =>
        s.id === editingService.id
          ? {
              ...s,
              name: serviceName,
              price: Number(servicePrice),
              duration_minutes: Number(serviceDuration),
              category: serviceCategory,
              description: serviceDesc
            }
          : s
      )
      setServices(updated)
      if (onUpdateServices) onUpdateServices(updated)
    } else {
      // Novo serviço
      const newServ: Service = {
        id: 'serv-' + Date.now(),
        barbershop_id: barbershop.id,
        name: serviceName,
        price: Number(servicePrice),
        duration_minutes: Number(serviceDuration),
        category: serviceCategory,
        description: serviceDesc || 'Atendimento de alta precisão e qualidade.',
        active: true
      }
      const updated = [...services, newServ]
      setServices(updated)
      if (onUpdateServices) onUpdateServices(updated)
    }

    setShowAddServiceModal(false)
  }

  const toggleServiceActive = (id: string) => {
    const updated = services.map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    )
    setServices(updated)
    if (onUpdateServices) onUpdateServices(updated)
  }

  // ===================== AGENDAMENTO MANUAL =====================
  const handleAddManualBooking = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClientName) return

    const selectedService = services.find((s) => s.id === newServiceId)
    const newApt: Appointment = {
      id: 'apt-' + Date.now(),
      barbershop_id: barbershop.id,
      barber_id: barbers[0]?.id,
      service_ids: [newServiceId],
      client_name: newClientName,
      client_phone: newClientPhone || 'Cliente Balcão',
      appointment_date: todayStr,
      start_time: newTime,
      total_price: selectedService?.price || 40,
      total_duration: selectedService?.duration_minutes || 30,
      status: 'confirmed',
      notes: 'Agendamento manual via balcão',
      created_at: new Date().toISOString()
    }

    const updated = [newApt, ...appointments]
    setAppointments(updated)
    if (onUpdateAppointments) onUpdateAppointments(updated)

    setNewClientName('')
    setNewClientPhone('')
    setShowAddBookingModal(false)
  }

  // ===================== GESTÃO DE PAUSAS / DIAS BLOQUEADOS =====================
  const handleAddPauseDate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPauseDate) return

    const currentBlocked = barbershop.blocked_dates || []
    if (currentBlocked.includes(newPauseDate)) {
      alert('Esta data já está bloqueada.')
      return
    }

    const updatedBlocked = [...currentBlocked, newPauseDate]
    const updatedShop: Barbershop = {
      ...barbershop,
      blocked_dates: updatedBlocked
    }

    if (onUpdateBarbershop) onUpdateBarbershop(updatedShop)
    setNewPauseDate('')
    setNewPauseReason('')
  }

  const handleRemovePauseDate = (dateToRemove: string) => {
    const currentBlocked = barbershop.blocked_dates || []
    const updatedBlocked = currentBlocked.filter((d) => d !== dateToRemove)
    const updatedShop: Barbershop = {
      ...barbershop,
      blocked_dates: updatedBlocked
    }
    if (onUpdateBarbershop) onUpdateBarbershop(updatedShop)
  }

  // ===================== EXCLUSÃO DE CONTA COM TRAVA ESTRITA =====================
  const handleConfirmDelete = () => {
    if (deleteConfirmationText.trim() !== 'Excluir conta') {
      alert('Digite exatamente "Excluir conta" para prosseguir.')
      return
    }
    if (onDeleteBarbershop) {
      onDeleteBarbershop(barbershop.id)
    }
  }

  // Mensagem WhatsApp para o cliente de hoje
  const getClientWhatsappUrl = (apt: Appointment) => {
    const phone = apt.client_phone.replace(/\D/g, '')
    const msg = `Olá ${apt.client_name}! Confirmando seu corte hoje às ${apt.start_time} na ${barbershop.name}. Te aguardo!`
    return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 pb-32 sm:pb-20 select-none">
      {/* ===================== TOPO ADMINISTRATIVO ===================== */}
      <header className="sticky top-0 z-30 bg-[#0d0f17]/95 border-b border-slate-800/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-900 shrink-0">
              <img
                src={barbershop.logo_url}
                alt={barbershop.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h1 className="font-extrabold text-sm text-white truncate max-w-[150px] sm:max-w-none">
                  {barbershop.name}
                </h1>
              </div>
              <p className="text-[11px] text-amber-400 font-medium">Painel do Barbeiro</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBackToClientView && (
              <button
                onClick={onBackToClientView}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver como</span> Cliente
              </button>
            )}

            <PWAInstallPrompt variant="compact" buttonText="App Barbeiro" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* ===================== ALERTA DE VENCIMENTO DA MENSALIDADE (5, 4, 3, 2, 1 DIAS) ===================== */}
        {daysUntilDue <= 5 && daysUntilDue >= 0 && barbershop.subscription_status !== 'blocked' && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-300">
                  {daysUntilDue === 0
                    ? 'Atenção: Sua mensalidade vence hoje!'
                    : daysUntilDue === 1
                    ? 'Atenção: Sua mensalidade vence amanhã!'
                    : `Atenção: Sua mensalidade vence em ${daysUntilDue} dias!`}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Valor: <strong>R$ {(barbershop.monthly_fee || 50).toFixed(2).replace('.', ',')}</strong>. Pague via PIX para manter seus agendamentos online sem interrupção.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('perfil')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-lg shadow-amber-500/20"
            >
              <span>Ver Chave PIX & QR Code</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================== ALERTA SE ESTIVER BLOQUEADO ===================== */}
        {barbershop.subscription_status === 'blocked' && (
          <div className="p-5 rounded-3xl bg-rose-950/40 border border-rose-500/50 text-slate-200 space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Acesso Temporariamente Suspenso</h3>
                <p className="text-xs text-rose-200/80">
                  Seu link de agendamento público está pausado por pendência na mensalidade.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
              <p className="text-slate-400">Pague via PIX para reativação imediata:</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-amber-400 text-sm">{barbershop.pix_key || DEFAULT_PIX_KEY}</span>
                <button
                  onClick={handleCopyPix}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedPixKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPixKey ? 'Copiado!' : 'Copiar PIX'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Titular: {DEFAULT_PIX_NAME} - Banco Inter</p>
            </div>
          </div>
        )}

        {/* ===================== CARD DO LINK PÚBLICO (DIVULGAÇÃO) ===================== */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Seu Link de Agendamento</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Coloque na bio do seu Instagram ou envie no WhatsApp dos clientes.
              </p>
              <span className="text-xs font-mono text-amber-300 mt-1 block truncate max-w-[280px] sm:max-w-sm">
                {publicUrl}
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer ${
              copiedLink
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Link</span>
              </>
            )}
          </button>
        </div>

        {/* ===================== FILTRO DE HISTÓRICO & MÉTRICAS DINÂMICAS ===================== */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Filtrar Período do Histórico:</span>
            </div>

            {/* Chips de Filtro */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 overflow-x-auto text-xs">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Esta Semana' },
                { id: 'month', label: 'Este Mês' },
                { id: 'all', label: 'Geral (Todos)' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                    historyFilter === f.id
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards de Métricas Recalculadas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Cortes ({filterLabel})</span>
                <Scissors className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white">{metricsCount}</p>
              <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">
                {metricsCompletedCount} atendidos / confirmados
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Faturamento Estimado</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white">
                R$ {metricsRevenue.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">referente a {filterLabel}</p>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Ticket Médio</span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">
                R$ {metricsCount > 0 ? (metricsRevenue / metricsCount).toFixed(2).replace('.', ',') : '0,00'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">por agendamento</p>
            </div>
          </div>
        </div>

        {/* ===================== ABAS DO PAINEL (DESKTOP) ===================== */}
        <div className="hidden sm:flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
          {[
            { id: 'agenda', label: 'Agenda & Histórico', icon: Calendar },
            { id: 'servicos', label: 'Serviços & Preços', icon: Scissors },
            { id: 'horarios', label: 'Horários & Pausas', icon: Clock },
            { id: 'perfil', label: 'Dados da Barbearia & Mensalidade', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ===================== ABA 1: AGENDA & HISTÓRICO DE CORTES ===================== */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">
                  {historyFilter === 'today' ? 'Horários Agendados de Hoje' : `Histórico de Cortes (${filterLabel})`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {filteredAppointments.length} agendamento(s) listado(s)
                </p>
              </div>

              <button
                onClick={() => setShowAddBookingModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar Balcão</span>
              </button>
            </div>

            {/* AVISO DE NOTIFICAÇÃO AUTOMÁTICA ATIVA */}
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 animate-pulse" />
              <div>
                <p className="font-bold text-emerald-300">
                  Notificação automática ativa no app
                </p>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  O sistema já notifica seus clientes automaticamente antes do horário do corte. Você também tem o botão verde ao lado de cada cliente para enviar mensagem manual no WhatsApp sempre que desejar.
                </p>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
                Nenhum agendamento encontrado para {filterLabel}.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAppointments.map((apt) => {
                  const serviceNames = services
                    .filter((s) => apt.service_ids.includes(s.id))
                    .map((s) => s.name)
                    .join(' + ') || 'Corte Padrão'

                  const isForToday = apt.appointment_date === todayStr
                  const hasPhone = apt.client_phone && apt.client_phone !== 'Cliente Balcão'

                  return (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
                    >
                      <div className="flex items-start gap-3">
                        {/* Horário & Data */}
                        <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-bold shrink-0">
                          <span className="text-amber-400 text-sm leading-none">{apt.start_time}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {apt.appointment_date.split('-').slice(1).reverse().join('/')}
                          </span>
                          <span className="text-[9px] text-slate-500">{apt.total_duration}m</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-white">{apt.client_name}</h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                apt.status === 'confirmed'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : apt.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {apt.status === 'confirmed'
                                ? 'Confirmado'
                                : apt.status === 'completed'
                                ? 'Concluído'
                                : 'Cancelado'}
                            </span>

                            {apt.reminder_preference && (
                              <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                Lembrete: {apt.reminder_preference}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 mt-0.5">{serviceNames}</p>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                            <span className="text-amber-400 font-bold">
                              R$ {apt.total_price.toFixed(2).replace('.', ',')}
                            </span>
                            {hasPhone && (
                              <span className="text-slate-400">
                                Tel: {apt.client_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações: Botão WhatsApp + Status */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                        {/* BOTÃO WHATSAPP DIRETO AO LADO DO CLIENTE */}
                        {hasPhone && isForToday && (
                          <a
                            href={getClientWhatsappUrl(apt)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enviar WhatsApp de confirmação para este cliente"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {apt.status !== 'completed' && (
                          <button
                            onClick={() => updateStatus(apt.id, 'completed')}
                            title="Marcar como Concluído"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Concluir</span>
                          </button>
                        )}

                        {apt.status !== 'cancelled' && (
                          <button
                            onClick={() => updateStatus(apt.id, 'cancelled')}
                            title="Cancelar Agendamento"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== ABA 2: SERVIÇOS & PREÇOS ===================== */}
        {activeTab === 'servicos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Catálogo de Serviços</h3>
                <p className="text-xs text-slate-400">Cadastre e edite os valores e durações visíveis para os clientes.</p>
              </div>

              <button
                onClick={handleOpenAddService}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Serviço</span>
              </button>
            </div>

            {services.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-dashed border-amber-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <Scissors className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Nenhum serviço cadastrado ainda</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Adicione os serviços que você realiza (ex: Corte, Barba, Sobrancelha) com preços e tempos de duração para seus clientes agendarem.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddService}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Serviço</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{s.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-semibold uppercase">
                          {s.category || 'geral'}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="text-amber-400 font-extrabold text-sm">
                          R$ {s.price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{s.duration_minutes} minutos</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão de Edição */}
                      <button
                        onClick={() => handleOpenEditService(s)}
                        title="Editar preço e duração"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Botão de Pausar / Ativar */}
                      <button
                        onClick={() => toggleServiceActive(s.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          s.active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {s.active ? 'Ativo' : 'Pausado'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== ABA 3: HORÁRIOS & PAUSAS ===================== */}
        {activeTab === 'horarios' && (
          <div className="space-y-6">
            {/* Seção 1: Pausas Programadas / Férias / Viagens */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Pausas Programadas, Viagens & Feriados</h3>
                  <p className="text-xs text-slate-400">
                    Bloqueie dias em que a barbearia estará fechada. Os clientes não poderão marcar horários nessas datas.
                  </p>
                </div>
              </div>

              {/* Formulário para Bloquear Data */}
              <form onSubmit={handleAddPauseDate} className="flex flex-col sm:flex-row gap-2 pt-1 text-xs">
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={newPauseDate}
                  onChange={(e) => setNewPauseDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Motivo (ex: Viagem, Feriado)"
                  value={newPauseReason}
                  onChange={(e) => setNewPauseReason(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bloquear Data</span>
                </button>
              </form>

              {/* Lista de Datas Bloqueadas */}
              <div className="space-y-2 pt-2">
                {(!barbershop.blocked_dates || barbershop.blocked_dates.length === 0) ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhuma data de pausa bloqueada no momento.
                  </p>
                ) : (
                  barbershop.blocked_dates.map((dateStr) => {
                    const [y, m, d] = dateStr.split('-')
                    return (
                      <div
                        key={dateStr}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                          <span className="font-mono font-bold text-white">{`${d}/${m}/${y}`}</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold">
                            Dia Bloqueado
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemovePauseDate(dateStr)}
                          className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                          title="Desbloquear data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Seção 2: Expediente Semanal Regular */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-white">Horários Regulares de Atendimento Semanal</h3>
              <div className="space-y-2">
                {workingHours.map((wh) => (
                  <div
                    key={wh.day_of_week}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-200">{wh.day_name}</span>
                    {wh.is_open ? (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-mono font-semibold">
                          {wh.open_time} - {wh.close_time}
                        </span>
                        {wh.lunch_start && (
                          <span className="text-slate-500 text-[11px]">
                            (Almoço {wh.lunch_start}-{wh.lunch_end})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-semibold">
                        Fechado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== ABA 4: DADOS DA BARBEARIA & MENSALIDADE ===================== */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            {/* SEÇÃO DA MENSALIDADE COM QR CODE E CHAVE PIX */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Sua Mensalidade & Assinatura</h3>
                  <p className="text-xs text-slate-400">Gerenciamento do plano da sua barbearia no BarberApp</p>
                </div>
              </div>

              {/* Informações de Status e Valor */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                  <span className="text-slate-400 text-[11px]">Valor da Mensalidade:</span>
                  <p className="font-black text-amber-400 text-lg">
                    R$ {(barbershop.monthly_fee || 50).toFixed(2).replace('.', ',')}
                  </p>
                  <span className="text-[10px] text-slate-400">preço fixo mensal</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                  <span className="text-slate-400 text-[11px]">Próximo Vencimento:</span>
                  <p className="font-bold text-white text-base">
                    {barbershop.next_billing_date ? barbershop.next_billing_date.split('-').reverse().join('/') : `Dia ${barbershop.due_day || 10}`}
                  </p>
                  <span className={`text-[10px] font-bold ${daysUntilDue <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {daysUntilDue <= 0 ? 'Vence hoje' : `${daysUntilDue} dias restantes`}
                  </span>
                </div>
              </div>

              {/* QR CODE DO BANCO INTER E CHAVE PIX */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <p className="text-xs font-bold text-slate-300">
                  Pague apontando a câmera para o QR Code abaixo:
                </p>

                <div className="flex justify-center">
                  <div className="p-2.5 rounded-2xl bg-white shadow-xl border-2 border-amber-500/40 inline-block">
                    <img
                      src={DEFAULT_PIX_QRCODE}
                      alt="QR Code PIX Banco Inter"
                      className="w-48 h-48 object-contain rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-slate-400 text-[11px]">Ou utilize a chave PIX copia e cola:</p>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 max-w-sm mx-auto">
                    <span className="font-mono font-bold text-amber-300 text-xs truncate mr-2">
                      {barbershop.pix_key || DEFAULT_PIX_KEY}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      {copiedPixKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPixKey ? 'Copiado!' : 'Copiar Chave'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1">
                    Titular: {DEFAULT_PIX_NAME} (Banco Inter)
                  </p>
                </div>

                <a
                  href={`https://wa.me/55${barbershop.phone_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá João! Realizei o pagamento da mensalidade de R$ ${(barbershop.monthly_fee || 50).toFixed(2).replace('.', ',')} da barbearia ${barbershop.name}. Segue o comprovante em anexo:`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-sm mx-auto py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Enviar Comprovante via WhatsApp</span>
                </a>
              </div>
            </div>

            {/* DADOS CADASTRAIS DA BARBEARIA (EDITÁVEL) */}
            <form onSubmit={handleSaveProfile} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Dados do Estabelecimento</h3>
                  <p className="text-[11px] text-slate-400">Atualize sua logo, Instagram, endereço e contatos.</p>
                </div>

                {profileSaved && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/30 animate-in fade-in">
                    <Check className="w-3 h-3" />
                    <span>Salvo com sucesso!</span>
                  </span>
                )}
              </div>

              {/* FOTO / LOGO DA BARBEARIA */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-3.5">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-slate-900 shrink-0 shadow-md">
                  <img
                    src={profileLogo}
                    alt={profileName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 text-xs space-y-1">
                  <span className="font-bold text-white text-xs block">
                    Logo / Foto da Barbearia
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Aparece no topo da página de agendamentos para seus clientes.
                  </p>
                  <div className="pt-0.5">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="profile-logo-upload"
                    />
                    <label
                      htmlFor="profile-logo-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer active:scale-95 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Trocar Logo / Foto</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome da Barbearia *</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                  <span>Instagram da Barbearia</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus-within:border-amber-500">
                    <span className="text-pink-400 font-bold mr-1">@</span>
                    <input
                      type="text"
                      placeholder="seunegocio"
                      value={profileInstagram.replace('@', '')}
                      onChange={(e) => setProfileInstagram(e.target.value)}
                      className="w-full bg-transparent text-white text-xs focus:outline-none placeholder-slate-500"
                    />
                  </div>

                  {profileInstagram && (
                    <a
                      href={`https://instagram.com/${profileInstagram.replace('@', '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3 text-pink-400" />
                      <span>Testar</span>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Frase de Destaque / Slogan</label>
                <input
                  type="text"
                  value={profileSlogan}
                  onChange={(e) => setProfileSlogan(e.target.value)}
                  placeholder="Ex: Tradição, estilo e o melhor corte da região"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">WhatsApp de Contato & Notificações *</label>
                <input
                  type="tel"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Endereço Completo & Bairro/Cidade *</label>
                <input
                  type="text"
                  required
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Slug do Link Público (Fixo)</label>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-amber-300 font-mono text-xs">{publicUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-slate-400 hover:text-amber-400 p-1 cursor-pointer"
                    title="Copiar link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Alterações da Barbearia</span>
              </button>
            </form>

            {/* ZONA DE PERIGO: EXCLUSÃO DE CONTA */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="font-bold text-sm text-white">Zona de Perigo</h4>
              </div>
              <p className="text-slate-400 text-xs">
                Se você não deseja mais utilizar o BarberApp, pode excluir permanentemente a sua conta. Todos os seus dados, histórico e link de clientes serão apagados.
              </p>
              <button
                onClick={() => {
                  setDeleteConfirmationText('')
                  setShowDeleteModal(true)
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Minha Barbearia</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ===================== MODAL DE NOVO/EDITAR SERVIÇO ===================== */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12151f] border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button
                onClick={() => setShowAddServiceModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Corte Degradê Navalhado"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={servicePrice}
                    onChange={(e) => setServicePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duração (min) *</label>
                  <input
                    type="number"
                    step="5"
                    required
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="cabelo">Cabelo</option>
                  <option value="barba">Barba</option>
                  <option value="combo">Combo</option>
                  <option value="especial">Especial</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição Curta</label>
                <input
                  type="text"
                  placeholder="Ex: Inclui lavagem e finalização com pomada"
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE AGENDAMENTO MANUAL BALCÃO ===================== */}
      {showAddBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12151f] border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-white">Novo Agendamento Balcão</h3>
              <button
                onClick={() => setShowAddBookingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualBooking} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Serviço</label>
                <select
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - R$ {s.price.toFixed(2)} ({s.duration_minutes}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Horário</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBookingModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CONTA ===================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12151f] border border-rose-500/50 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-white">Excluir Barbearia Definitivamente</h3>
              <p className="text-xs text-slate-400">
                Esta ação é irreversível. Todos os seus agendamentos e seu link <strong>{barbershop.slug}</strong> serão excluídos.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-semibold">
                Digite exatamente <strong className="text-rose-400">Excluir conta</strong> para confirmar:
              </label>
              <input
                type="text"
                placeholder="Excluir conta"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-rose-500/40 text-white font-mono text-center focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim() !== 'Excluir conta'}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs cursor-pointer transition-all"
              >
                Excluir Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== BARRA DE NAVEGAÇÃO INFERIOR PARA CELULAR (TAB BAR) ===================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0f17]/95 border-t border-slate-800/90 backdrop-blur-xl sm:hidden px-2 py-2">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {[
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'servicos', label: 'Serviços', icon: Scissors },
            { id: 'horarios', label: 'Horários', icon: Clock },
            { id: 'perfil', label: 'Mensalidade', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-amber-400 bg-amber-500/10 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[11px] leading-none">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
