import React, { useState, useMemo } from 'react'
import {
  MapPin,
  Clock,
  Phone,
  Check,
  Calendar as CalendarIcon,
  ChevronRight,
  Scissors,
  CheckCircle2,
  ArrowLeft,
  Bell,
  Sun,
  Moon,
  Users
} from 'lucide-react'
import confetti from 'canvas-confetti'
import type { Barbershop, Service, Barber } from '../types'
import { getStylePreset } from '../lib/stylePresets'
import { PWAInstallPrompt } from './PWAInstallPrompt'

const InstagramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

interface BookingClientViewProps {
  barbershop: Barbershop
  services: Service[]
  barbers?: Barber[]
  theme?: 'dark' | 'light'
  onToggleTheme?: () => void
  onNewBooking?: (booking: any) => void
}

export const BookingClientView: React.FC<BookingClientViewProps> = ({
  barbershop,
  services,
  barbers = [],
  theme = 'dark',
  onToggleTheme,
  onNewBooking
}) => {
  // Estilo visual configurado para a barbearia
  const preset = getStylePreset(barbershop.style_preset)

  // Equipe de barbeiros ativos
  const activeBarbers = useMemo(() => {
    return barbers.filter((b) => b.active !== false)
  }, [barbers])
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any')

  // Estados do fluxo de agendamento
  const [step, setStep] = useState<'service' | 'datetime' | 'customer' | 'success'>('service')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('todos')

  // Data selecionada (padrão: hoje)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [selectedTime, setSelectedTime] = useState<string>('')

  // Dados do cliente e lembrete
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  const [reminderPreference, setReminderPreference] = useState<'10min' | '30min' | '1hour'>('30min')
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null)

  // Gerador de próximos 7 dias com verificação de bloqueio/pausa
  const nextDays = useMemo(() => {
    const days = []
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const dateString = d.toISOString().split('T')[0]
      const isToday = i === 0
      const isTomorrow = i === 1

      let label = dayNames[d.getDay()]
      if (isToday) label = 'Hoje'
      else if (isTomorrow) label = 'Amanhã'

      const isBlocked = Boolean(barbershop.blocked_dates?.includes(dateString))

      days.push({
        date: dateString,
        dayName: label,
        dayNumber: d.getDate(),
        month: monthNames[d.getMonth()],
        dayOfWeek: d.getDay(),
        isBlocked
      })
    }
    return days
  }, [barbershop.blocked_dates])

  // Horários disponíveis simulados
  const availableTimes = useMemo(() => {
    return [
      { time: '09:00', period: 'manha', available: true },
      { time: '09:40', period: 'manha', available: true },
      { time: '10:20', period: 'manha', available: false },
      { time: '11:00', period: 'manha', available: true },
      { time: '11:40', period: 'manha', available: true },
      { time: '14:00', period: 'tarde', available: true },
      { time: '14:40', period: 'tarde', available: true },
      { time: '15:20', period: 'tarde', available: false },
      { time: '16:00', period: 'tarde', available: true },
      { time: '16:40', period: 'tarde', available: true },
      { time: '17:20', period: 'tarde', available: true },
      { time: '18:00', period: 'noite', available: true },
      { time: '18:40', period: 'noite', available: true },
      { time: '19:20', period: 'noite', available: false }
    ]
  }, [selectedDate])

  // Filtragem de serviços
  const filteredServices = useMemo(() => {
    if (selectedCategory === 'todos') return services
    return services.filter((s) => s.category === selectedCategory)
  }, [services, selectedCategory])

  // Cálculos de totais
  const selectedServicesObjects = useMemo(() => {
    return services.filter((s) => selectedServices.includes(s.id))
  }, [services, selectedServices])

  const totalPrice = useMemo(() => {
    return selectedServicesObjects.reduce((acc, curr) => acc + curr.price, 0)
  }, [selectedServicesObjects])

  const totalDuration = useMemo(() => {
    return selectedServicesObjects.reduce((acc, curr) => acc + curr.duration_minutes, 0)
  }, [selectedServicesObjects])

  // Alternar serviço
  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter((sId) => sId !== id))
    } else {
      setSelectedServices([...selectedServices, id])
    }
  }

  // Máscara de telefone WhatsApp
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 11) value = value.slice(0, 11)

    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`
    } else if (value.length > 0) {
      value = `(${value}`
    }
    setClientPhone(value)
  }

  // Finalizar agendamento
  const handleFinishBooking = () => {
    if (!clientName.trim() || clientPhone.length < 14) {
      alert('Por favor, informe seu nome e um número de WhatsApp válido.')
      return
    }

    const chosenBarber = activeBarbers.find((b) => b.id === selectedBarberId)
    const assignedBarberId = selectedBarberId === 'any' ? (activeBarbers[0]?.id || undefined) : selectedBarberId
    const assignedBarberName = chosenBarber
      ? chosenBarber.name
      : selectedBarberId === 'any' && activeBarbers.length > 0
      ? 'Qualquer Barbeiro'
      : undefined

    const bookingData = {
      id: 'apt-' + Date.now(),
      barbershop_id: barbershop.id,
      barber_id: assignedBarberId,
      barber_name: assignedBarberName,
      service_ids: selectedServices,
      service_names: selectedServicesObjects.map((s) => s.name).join(' + '),
      client_name: clientName,
      client_phone: clientPhone,
      appointment_date: selectedDate,
      start_time: selectedTime,
      total_price: totalPrice,
      total_duration: totalDuration,
      status: 'confirmed',
      reminder_preference: reminderPreference,
      notes: clientNotes,
      created_at: new Date().toISOString()
    }

    setConfirmedBooking(bookingData)
    if (onNewBooking) onNewBooking(bookingData)

    setStep('success')

    // Disparar confetes de comemoração
    try {
      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 }
      })
    } catch {
      // Ignora caso canvas não esteja disponível
    }
  }

  // Formatar data em português
  const formattedDate = useMemo(() => {
    if (!selectedDate) return ''
    const [year, month, day] = selectedDate.split('-')
    return `${day}/${month}/${year}`
  }, [selectedDate])

  // Link do WhatsApp com mensagem pronta
  const whatsappUrl = useMemo(() => {
    if (!confirmedBooking) return ''
    const barberLine = confirmedBooking.barber_name ? `✂️ *Profissional:* ${confirmedBooking.barber_name}\n` : ''
    const msg = `💈 *NOVO AGENDAMENTO*\n\n` +
      `Olá! Acabei de agendar pelo aplicativo:\n` +
      `👤 *Cliente:* ${confirmedBooking.client_name}\n` +
      barberLine +
      `✂️ *Serviço(s):* ${confirmedBooking.service_names}\n` +
      `📅 *Data:* ${formattedDate}\n` +
      `⏰ *Horário:* ${confirmedBooking.start_time}\n` +
      `💰 *Total:* R$ ${confirmedBooking.total_price.toFixed(2).replace('.', ',')}\n` +
      (confirmedBooking.notes ? `📝 *Observação:* ${confirmedBooking.notes}\n` : '') +
      `\nAguardo a confirmação. Obrigado!`

    const phoneClean = barbershop.phone_whatsapp.replace(/\D/g, '')
    return `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`
  }, [confirmedBooking, formattedDate, barbershop.phone_whatsapp])

  const isLight = theme === 'light'
  const googleMapsQuery = barbershop.street && barbershop.number
    ? `${barbershop.street}, ${barbershop.number}`
    : barbershop.address.split('-')[0].trim()

  return (
    <div className={`min-h-screen pb-28 select-none transition-colors ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#090A0F] text-slate-100'}`}>
      {/* ===================== TOPO / BANNER ===================== */}
      <div className="relative w-full h-48 sm:h-64 overflow-hidden bg-slate-900">
        <img
          src={barbershop.banner_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80'}
          alt={barbershop.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${isLight ? 'from-slate-100 via-slate-100/50' : 'from-[#090A0F] via-[#090A0F]/60'} to-transparent`} />

        {/* Botão de Instalação PWA no Topo & Alternador de Tema */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label="Alternar tema claro/escuro"
              title={isLight ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}
          <PWAInstallPrompt variant="compact" />
        </div>
      </div>

      {/* ===================== PERFIL DA BARBEARIA ===================== */}
      <div className="max-w-md mx-auto px-4 -mt-16 relative z-10">
        <div className="flex items-end gap-3.5 mb-3">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-500/80 shadow-2xl bg-slate-900 shrink-0">
            <img
              src={barbershop.logo_url}
              alt={barbershop.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 pb-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ABERTO HOJE
            </div>
            <h1 className={`text-xl font-black tracking-tight leading-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>
              {barbershop.name}
            </h1>
            <p className="text-xs text-amber-500 font-medium">
              {barbershop.slogan}
            </p>
          </div>
        </div>

        {/* Atalhos Rápidos: Endereço & Redes */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 text-xs text-slate-300">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapsQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver rota no Google Maps (Endereço e Número)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 active:scale-95 transition-transform ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span className="truncate max-w-[170px]">
              {barbershop.street ? `${barbershop.street}, ${barbershop.number || 'S/N'}` : barbershop.address.split('-')[0]}
            </span>
          </a>

          {barbershop.instagram && (
            <a
              href={`https://instagram.com/${barbershop.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white shrink-0 active:scale-95 transition-transform"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
              <span>{barbershop.instagram.startsWith('@') ? barbershop.instagram : `@${barbershop.instagram}`}</span>
            </a>
          )}

          <a
            href={`https://wa.me/${barbershop.phone_whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white shrink-0 active:scale-95 transition-transform"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Contato</span>
          </a>
        </div>

        {barbershop.subscription_status === 'blocked' ? (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-3.5 my-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Agendamentos Online Pausados</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Esta barbearia está temporariamente indisponível para novos agendamentos online. Entre em contato diretamente pelo WhatsApp.
              </p>
            </div>
            <a
              href={`https://wa.me/${barbershop.phone_whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Falar no WhatsApp da Barbearia</span>
            </a>
          </div>
        ) : (
          <>
            {/* Indicador de Passos */}
            {step !== 'success' && (
              <div className={`flex items-center justify-between mb-5 p-2 rounded-2xl border ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800/80'
              }`}>
                <button
                  type="button"
                  onClick={() => setStep('service')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    step === 'service'
                      ? `${preset.primaryButton} shadow-md`
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>1. Serviços</span>
                </button>

                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mx-1" />

                <button
                  type="button"
                  onClick={() => selectedServices.length > 0 && setStep('datetime')}
                  disabled={selectedServices.length === 0}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    step === 'datetime'
                      ? `${preset.primaryButton} shadow-md`
                      : selectedServices.length > 0
                      ? isLight ? 'text-slate-600 hover:text-slate-900 cursor-pointer' : 'text-slate-400 hover:text-white cursor-pointer'
                      : 'text-slate-500 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>2. Horário</span>
                </button>

                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mx-1" />

                <button
                  type="button"
                  onClick={() => selectedServices.length > 0 && selectedTime && setStep('customer')}
                  disabled={selectedServices.length === 0 || !selectedTime}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    step === 'customer'
                      ? `${preset.primaryButton} shadow-md`
                      : selectedServices.length > 0 && selectedTime
                      ? isLight ? 'text-slate-600 hover:text-slate-900 cursor-pointer' : 'text-slate-400 hover:text-white cursor-pointer'
                      : 'text-slate-500 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>3. Confirmar</span>
                </button>
              </div>
            )}

        {/* ===================== PASSO 1: SERVIÇOS ===================== */}
        {step === 'service' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Categorias dos Serviços */}
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'combo', label: '🔥 Combos VIP' },
                { id: 'cabelo', label: 'Cabelo' },
                { id: 'barba', label: 'Barba' },
                { id: 'especial', label: 'Química & Spa' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-slate-200 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Lista de Serviços */}
            <div className="space-y-3">
              {filteredServices.length === 0 ? (
                <div className="p-8 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-slate-400 text-xs space-y-1">
                  <p className="font-bold text-white text-sm">Nenhum serviço disponível no momento</p>
                  <p className="text-slate-400 text-xs">A barbearia está organizando os horários e serviços. Volte em breve!</p>
                </div>
              ) : (
                filteredServices.map((service) => {
                  const isSelected = selectedServices.includes(service.id)
                  return (
                    <div
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500/15 to-transparent border-amber-500 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-white">
                            {service.name}
                          </h3>
                          {service.category === 'combo' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                              Destaque
                            </span>
                          )}
                        </div>
                        {service.combo_items && service.combo_items.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {service.combo_items.map((sub, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-semibold flex items-center gap-1"
                              >
                                <Scissors className="w-2.5 h-2.5" />
                                <span>{sub}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {service.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2.5 text-xs">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {service.duration_minutes} min
                          </span>
                          <span className="text-base font-extrabold text-amber-400">
                            R$ {service.price.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'border-2 border-slate-700 bg-slate-800/60'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                )
              }))}
            </div>
          </div>
        )}

        {/* ===================== PASSO 2: DATA & HORÁRIO ===================== */}
        {step === 'datetime' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Escolha do Barbeiro / Profissional (quando equipe > 1) */}
            {activeBarbers.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Escolha o Profissional</span>
                  </label>
                  <span className={`text-[11px] font-bold ${preset.accentText}`}>
                    {selectedBarberId === 'any'
                      ? 'Qualquer Barbeiro'
                      : activeBarbers.find((b) => b.id === selectedBarberId)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBarberId('any')}
                    className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                      selectedBarberId === 'any'
                        ? `${preset.accentBorder} border-2 bg-slate-800/90 shadow-md ring-1 ring-amber-500/30`
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-xs truncate ${isLight && selectedBarberId !== 'any' ? 'text-slate-900' : 'text-white'}`}>
                        Qualquer um
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">1º disponível</p>
                    </div>
                  </button>

                  {activeBarbers.map((barber) => {
                    const isSelected = selectedBarberId === barber.id
                    return (
                      <button
                        key={barber.id}
                        type="button"
                        onClick={() => setSelectedBarberId(barber.id)}
                        className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                          isSelected
                            ? `${preset.accentBorder} border-2 bg-slate-800/90 shadow-md ring-1 ring-amber-500/30`
                            : isLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-800">
                          {barber.avatar_url ? (
                            <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-400 bg-amber-500/10">
                              <Scissors className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-xs truncate ${isLight && !isSelected ? 'text-slate-900' : 'text-white'}`}>
                            {barber.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {barber.role || 'Barbeiro'}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Seletor de Data Horizontal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Escolha o Dia
                </label>
                <span className={`text-xs font-semibold ${preset.accentText}`}>{formattedDate}</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {nextDays.map((d) => {
                  const isSelected = selectedDate === d.date
                  return (
                    <button
                      key={d.date}
                      disabled={d.isBlocked}
                      onClick={() => !d.isBlocked && setSelectedDate(d.date)}
                      className={`p-2.5 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                        d.isBlocked
                          ? 'bg-slate-950/80 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? `${preset.primaryButton} font-bold shadow-lg scale-[1.02]`
                          : isLight
                          ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-semibold ${isSelected && !d.isBlocked ? 'text-slate-950 font-extrabold' : 'text-slate-400'}`}>
                        {d.dayName}
                      </span>
                      <span className="text-lg font-black mt-0.5">{d.dayNumber}</span>
                      <span className={`text-[10px] ${d.isBlocked ? 'text-rose-400 font-bold' : isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                        {d.isBlocked ? 'Pausa' : d.month}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Horários */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Horários Disponíveis
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {availableTimes.map((item) => {
                  const isSelected = selectedTime === item.time
                  return (
                    <button
                      key={item.time}
                      disabled={!item.available}
                      onClick={() => setSelectedTime(item.time)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? `${preset.primaryButton} shadow-md`
                          : item.available
                          ? isLight
                            ? 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                            : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                          : 'bg-slate-950/60 border-slate-900 text-slate-600 line-through cursor-not-allowed opacity-50'
                      }`}
                    >
                      {item.time}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================== PASSO 3: DADOS DO CLIENTE ===================== */}
        {step === 'customer' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Resumo Rápido */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-white text-sm mb-2 flex items-center justify-between">
                <span>Resumo do Agendamento</span>
                <span className={`font-extrabold text-base ${preset.accentText}`}>
                  R$ {totalPrice.toFixed(2).replace('.', ',')}
                </span>
              </h4>
              <div className="flex justify-between text-slate-400">
                <span>Serviços:</span>
                <span className="text-slate-200 font-medium text-right max-w-[200px]">
                  {selectedServicesObjects.map((s) => s.name).join(', ')}
                </span>
              </div>
              {activeBarbers.length > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Profissional:</span>
                  <span className={`font-bold ${preset.accentText}`}>
                    {selectedBarberId === 'any'
                      ? 'Qualquer Barbeiro'
                      : activeBarbers.find((b) => b.id === selectedBarberId)?.name || 'Barbeiro'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Data e Horário:</span>
                <span className={`font-bold ${preset.accentText}`}>
                  {formattedDate} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Duração Estimada:</span>
                <span className="text-slate-200">{totalDuration} minutos</span>
              </div>
            </div>

            {/* Formulário */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  WhatsApp (com DDD) *
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={clientPhone}
                  onChange={handlePhoneChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none text-white text-sm"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Você receberá a confirmação e lembretes por este número.
                </span>
              </div>

              {/* Escolha do Tempo de Lembrete */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Com quanto tempo antes você quer ser lembrado?</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '10min', label: '10 min antes' },
                    { id: '30min', label: '30 min (Recomendado)' },
                    { id: '1hour', label: '1 hora antes' }
                  ].map((rem) => (
                    <button
                      key={rem.id}
                      type="button"
                      onClick={() => setReminderPreference(rem.id as any)}
                      className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                        reminderPreference === rem.id
                          ? `${preset.primaryButton} shadow-md`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {rem.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-emerald-400/90 mt-1.5 block">
                  ✓ O sistema já envia o lembrete automaticamente no seu WhatsApp.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Observações para o Barbeiro (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Primeira vez na barbearia, prefiro disfarçado na zero."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none text-white text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================== SUCESSO / CONFIRMAÇÃO ===================== */}
        {step === 'success' && confirmedBooking && (
          <div className="py-6 space-y-5 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Agendamento Realizado!</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Seu horário foi reservado com sucesso na {barbershop.name}.
              </p>
            </div>

            {/* Cartão de Confirmação */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-[#12151f] border border-amber-500/30 text-left text-xs space-y-2.5 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{confirmedBooking.client_name}</span>
              </div>
              {confirmedBooking.barber_name && (
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Profissional:</span>
                  <span className={`font-bold ${preset.accentText}`}>{confirmedBooking.barber_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Data & Hora:</span>
                <span className={`font-bold ${preset.accentText}`}>
                  {formattedDate} às {confirmedBooking.start_time}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Serviço:</span>
                <span className="font-medium text-slate-200">{confirmedBooking.service_names}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Valor Total:</span>
                <span className={`font-extrabold text-base ${preset.accentText}`}>
                  R$ {confirmedBooking.total_price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Botão de Enviar Confirmação no WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Enviar Confirmação no WhatsApp</span>
            </a>

            {/* Botão de Instalação do App */}
            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[11px] text-slate-400 mb-3">
                Quer ter a barbearia na palma da mão para o próximo corte?
              </p>
              <PWAInstallPrompt
                variant="button"
                buttonText="Salvar App no meu Celular"
                className="w-full py-3"
              />
            </div>

            <button
              onClick={() => {
                setStep('service')
                setSelectedServices([])
                setSelectedTime('')
                setSelectedBarberId('any')
                setConfirmedBooking(null)
              }}
              className="text-xs text-slate-500 hover:text-slate-300 underline pt-2 block mx-auto cursor-pointer"
            >
              Fazer outro agendamento
            </button>
          </div>
        )}
          </>
        )}
      </div>

      {/* ===================== BARRA INFERIOR FLUTUANTE ===================== */}
      {step !== 'success' && selectedServices.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0f17]/95 border-t border-slate-800/90 backdrop-blur-xl p-3.5">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-slate-400">
                {selectedServices.length} {selectedServices.length === 1 ? 'serviço' : 'serviços'} • {totalDuration} min
              </p>
              <p className={`text-lg font-black leading-tight ${preset.accentText}`}>
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {step !== 'service' && (
                <button
                  onClick={() => {
                    if (step === 'customer') setStep('datetime')
                    else if (step === 'datetime') setStep('service')
                  }}
                  className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-transform cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {step === 'service' && (
                <button
                  onClick={() => setStep('datetime')}
                  className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-transform cursor-pointer ${preset.primaryButton}`}
                >
                  <span>Escolher Horário</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === 'datetime' && (
                <button
                  onClick={() => setStep('customer')}
                  disabled={!selectedTime}
                  className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
                    selectedTime
                      ? `${preset.primaryButton} shadow-lg active:scale-95`
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Identificação</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === 'customer' && (
                <button
                  onClick={handleFinishBooking}
                  className={`px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-transform cursor-pointer ${preset.primaryButton}`}
                >
                  <span>Confirmar</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner PWA flutuante sutil se o cliente não tiver instalado ainda */}
      {step === 'service' && selectedServices.length === 0 && (
        <PWAInstallPrompt variant="banner" />
      )}
    </div>
  )
}
