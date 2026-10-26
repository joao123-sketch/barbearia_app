import React, { useState } from 'react'
import {
  Calendar,
  DollarSign,
  Users,
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
  Check
} from 'lucide-react'
import type { Barbershop, Barber, Service, Appointment, WorkingHour } from '../types'
import { PWAInstallPrompt } from './PWAInstallPrompt'

interface AdminDashboardProps {
  barbershop: Barbershop
  barbers: Barber[]
  services: Service[]
  appointments: Appointment[]
  workingHours: WorkingHour[]
  onBackToClientView?: () => void
  onUpdateAppointments?: (appointments: Appointment[]) => void
  onUpdateServices?: (services: Service[]) => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  barbershop,
  barbers,
  services: initialServices,
  appointments: initialAppointments,
  workingHours,
  onBackToClientView,
  onUpdateAppointments,
  onUpdateServices
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'servicos' | 'horarios' | 'perfil'>('agenda')
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [services, setServices] = useState<Service[]>(initialServices)
  const [copiedLink, setCopiedLink] = useState(false)

  const toggleServiceActive = (id: string) => {
    const updated = services.map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    )
    setServices(updated)
    if (onUpdateServices) onUpdateServices(updated)
  }

  // Modal de novo agendamento manual
  const [showAddModal, setShowAddModal] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newServiceId, setNewServiceId] = useState(services[0]?.id || '')
  const [newTime, setNewTime] = useState('15:00')

  // Copiar link público para divulgar no Instagram/WhatsApp
  const publicUrl = `${window.location.origin}/${barbershop.slug}`
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Alterar status de agendamento
  const updateStatus = (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    const updated = appointments.map((apt) =>
      apt.id === id ? { ...apt, status } : apt
    )
    setAppointments(updated)
    if (onUpdateAppointments) onUpdateAppointments(updated)
  }

  // Adicionar agendamento manual
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
      appointment_date: new Date().toISOString().split('T')[0],
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
    setShowAddModal(false)
  }

  // Métricas do dia
  const todayStr = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter((a) => a.appointment_date === todayStr)
  const todayRevenue = todayAppointments
    .filter((a) => a.status !== 'cancelled')
    .reduce((acc, curr) => acc + curr.total_price, 0)

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
            {/* Botão de Ver Como Cliente */}
            {onBackToClientView && (
              <button
                onClick={onBackToClientView}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver como</span> Cliente
              </button>
            )}

            {/* PWA Barbeiro */}
            <PWAInstallPrompt variant="compact" buttonText="App Barbeiro" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
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

        {/* ===================== CARDS DE MÉTRICAS ===================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Agendamentos Hoje</span>
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">{todayAppointments.length}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">
              {todayAppointments.filter((a) => a.status === 'confirmed').length} confirmados
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Faturamento Estimado</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">
              R$ {todayRevenue.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">referente a hoje</p>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Equipe Ativa</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">{barbers.length} profissionais</p>
            <p className="text-[10px] text-slate-400 mt-0.5">todos operando</p>
          </div>
        </div>

        {/* ===================== ABAS DO PAINEL (DESKTOP) ===================== */}
        <div className="hidden sm:flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
          {[
            { id: 'agenda', label: 'Agenda do Dia', icon: Calendar },
            { id: 'servicos', label: 'Serviços & Preços', icon: Scissors },
            { id: 'horarios', label: 'Horários & Pausas', icon: Clock },
            { id: 'perfil', label: 'Dados da Barbearia', icon: Settings }
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

        {/* ===================== ABA 1: AGENDA DO DIA ===================== */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Horários Marcados de Hoje</h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar Balcão</span>
              </button>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
                Nenhum agendamento para hoje ainda. Compartilhe seu link com os clientes!
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayAppointments.map((apt) => {
                  const serviceNames = services
                    .filter((s) => apt.service_ids.includes(s.id))
                    .map((s) => s.name)
                    .join(' + ')

                  return (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-bold shrink-0">
                          <span className="text-amber-400 text-sm leading-none">{apt.start_time}</span>
                          <span className="text-[10px] text-slate-400">{apt.total_duration}m</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
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
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">{serviceNames}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className="text-amber-400 font-bold">
                              R$ {apt.total_price.toFixed(2).replace('.', ',')}
                            </span>
                            {apt.client_phone && apt.client_phone !== 'Cliente Balcão' && (
                              <a
                                href={`https://wa.me/55${apt.client_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-emerald-400 hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{apt.client_phone}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações de Status */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
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
                <p className="text-xs text-slate-400">Preços e durações visíveis para os clientes.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-sm text-white">{s.name}</h4>
                    <p className="text-xs text-slate-400">{s.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-amber-400 font-extrabold text-sm">
                        R$ {s.price.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{s.duration_minutes} minutos</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleServiceActive(s.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                      s.active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {s.active ? 'Ativo' : 'Pausado'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== ABA 3: HORÁRIOS & EXPEDIENTE ===================== */}
        {activeTab === 'horarios' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white">Horários de Atendimento Semanal</h3>

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
        )}

        {/* ===================== ABA 4: PERFIL DA BARBEARIA ===================== */}
        {activeTab === 'perfil' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white">Configurações da Unidade</h3>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome da Barbearia</label>
                <input
                  type="text"
                  readOnly
                  value={barbershop.name}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Slug do Link</label>
                <input
                  type="text"
                  readOnly
                  value={barbershop.slug}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">WhatsApp Notificações</label>
                <input
                  type="text"
                  readOnly
                  value={barbershop.phone_whatsapp}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  readOnly
                  value={barbershop.address}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================== MODAL DE AGENDAMENTO MANUAL ===================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12151f] border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-white">Novo Agendamento Balcão</h3>
              <button
                onClick={() => setShowAddModal(false)}
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
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
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
            { id: 'perfil', label: 'Perfil', icon: Settings }
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
