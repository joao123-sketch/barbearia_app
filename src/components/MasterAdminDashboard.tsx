import React, { useState, useMemo } from 'react'
import {
  DollarSign,
  AlertTriangle,
  Lock,
  Unlock,
  Trash2,
  Phone,
  ExternalLink,
  Edit2,
  CheckCircle2,
  Copy,
  Check,
  Search,
  ShieldCheck,
  Store,
  CreditCard,
  QrCode,
  UserPlus
} from 'lucide-react'
import type { Barbershop, SubscriptionStatus } from '../types'
import { DEFAULT_PIX_KEY, DEFAULT_PIX_NAME, DEFAULT_PIX_QRCODE, DEFAULT_MONTHLY_FEE } from '../lib/mockData'

interface MasterAdminDashboardProps {
  barbershops: Barbershop[]
  onUpdateBarbershops: (shops: Barbershop[]) => void
  onNavigateToShop?: (slug: string) => void
}

export const MasterAdminDashboard: React.FC<MasterAdminDashboardProps> = ({
  barbershops,
  onUpdateBarbershops,
  onNavigateToShop
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedRegisterLink, setCopiedRegisterLink] = useState(false)

  const registerUrl = `${window.location.origin}/cadastrar`

  const handleCopyRegisterLink = () => {
    navigator.clipboard.writeText(registerUrl)
    setCopiedRegisterLink(true)
    setTimeout(() => setCopiedRegisterLink(false), 2500)
  }

  // Mensalidade Base Global da Plataforma
  const [baseFee, setBaseFee] = useState<number>(() => {
    const saved = localStorage.getItem('barber_master_base_fee')
    return saved ? Number(saved) : DEFAULT_MONTHLY_FEE
  })
  const [isEditingBaseFee, setIsEditingBaseFee] = useState(false)
  const [newBaseFeeInput, setNewBaseFeeInput] = useState(baseFee)

  // Modal de edição individual de barbearia
  const [editingShop, setEditingShop] = useState<Barbershop | null>(null)
  const [editFee, setEditFee] = useState<number>(50)
  const [editDueDay, setEditDueDay] = useState<number>(10)

  // Modal de Exclusão de Barbearia com trava de segurança
  const [shopToDelete, setShopToDelete] = useState<Barbershop | null>(null)
  const [deleteInputText, setDeleteInputText] = useState('')

  // Visualizar QR Code PIX
  const [showPixPreview, setShowPixPreview] = useState(false)

  // Salvar nova mensalidade base global
  const handleSaveBaseFee = (e: React.FormEvent) => {
    e.preventDefault()
    setBaseFee(newBaseFeeInput)
    localStorage.setItem('barber_master_base_fee', String(newBaseFeeInput))
    setIsEditingBaseFee(false)
  }

  // Copiar chave PIX
  const handleCopyPix = () => {
    navigator.clipboard.writeText(DEFAULT_PIX_KEY)
    setCopiedPix(true)
    setTimeout(() => setCopiedPix(false), 2000)
  }

  // Filtragem
  const filteredShops = useMemo(() => {
    return barbershops.filter((shop) => {
      const matchesSearch =
        shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.phone_whatsapp.includes(searchTerm)

      if (filterStatus === 'all') return matchesSearch
      return matchesSearch && shop.subscription_status === filterStatus
    })
  }, [barbershops, searchTerm, filterStatus])

  // KPIs
  const totalShops = barbershops.length
  const activeShops = barbershops.filter((s) => s.subscription_status === 'active').length
  const overdueShops = barbershops.filter((s) => s.subscription_status === 'overdue' || s.subscription_status === 'pending').length
  const blockedShops = barbershops.filter((s) => s.subscription_status === 'blocked').length
  const totalMRR = barbershops
    .filter((s) => s.subscription_status !== 'blocked')
    .reduce((acc, curr) => acc + (curr.monthly_fee || 50), 0)

  // Confirmar pagamento PIX e renovar por +30 dias
  const handleConfirmPayment = (shopId: string) => {
    const today = new Date()
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 30)

    const updated = barbershops.map((s) => {
      if (s.id === shopId) {
        return {
          ...s,
          subscription_status: 'active' as SubscriptionStatus,
          last_payment_date: today.toISOString().split('T')[0],
          next_billing_date: nextDate.toISOString().split('T')[0]
        }
      }
      return s
    })

    onUpdateBarbershops(updated)
    alert('Pagamento registrado com sucesso! Assinatura renovada por +30 dias.')
  }

  // Alternar Bloqueio / Desbloqueio
  const handleToggleBlock = (shopId: string) => {
    const shop = barbershops.find((s) => s.id === shopId)
    if (!shop) return

    const newStatus: SubscriptionStatus = shop.subscription_status === 'blocked' ? 'active' : 'blocked'
    const confirmMsg = newStatus === 'blocked'
      ? `Tem certeza que deseja bloquear "${shop.name}"? O link público e o painel dele serão suspensos.`
      : `Deseja reativar o acesso de "${shop.name}"?`

    if (window.confirm(confirmMsg)) {
      const updated = barbershops.map((s) =>
        s.id === shopId ? { ...s, subscription_status: newStatus } : s
      )
      onUpdateBarbershops(updated)
    }
  }

  // Excluir Barbearia com trava
  const handleExecuteDelete = () => {
    if (!shopToDelete) return
    if (deleteInputText.trim() !== 'Excluir') {
      alert('Digite exatamente "Excluir" para confirmar.')
      return
    }

    const updated = barbershops.filter((s) => s.id !== shopToDelete.id)
    onUpdateBarbershops(updated)
    setShopToDelete(null)
    setDeleteInputText('')
  }

  // Salvar alterações de mensalidade individual
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingShop) return

    const updated = barbershops.map((s) =>
      s.id === editingShop.id
        ? { ...s, monthly_fee: Number(editFee), due_day: Number(editDueDay) }
        : s
    )

    onUpdateBarbershops(updated)
    setEditingShop(null)
  }

  // Montar link do WhatsApp para cobrar o barbeiro
  const getCobrarWhatsappUrl = (shop: Barbershop) => {
    const phone = shop.phone_whatsapp.replace(/\D/g, '')
    const msg = `Olá, equipe da *${shop.name}*! Tudo bem?\n\n` +
      `Passando para lembrar sobre a mensalidade do seu sistema de agendamentos no valor de *R$ ${(shop.monthly_fee || 50).toFixed(2).replace('.', ',')}*.\n\n` +
      `🔑 *Chave PIX:* ${DEFAULT_PIX_KEY}\n` +
      `👤 *Titular:* ${DEFAULT_PIX_NAME} (Banco Inter)\n\n` +
      `Assim que realizar o pagamento, por favor envie o comprovante por aqui para mantermos seu sistema 100% ativo. Obrigado!`

    return `https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 pb-24 select-none">
      {/* ===================== TOPO MASTER ADMIN (PRIVADO) ===================== */}
      <header className="sticky top-0 z-30 bg-[#0d0f17]/95 border-b border-slate-800/80 backdrop-blur-md px-4 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white">
                  Painel Master SaaS
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  Área Exclusiva João
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gestão Geral de Barbearias, Mensalidades e Recebíveis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPixPreview(!showPixPreview)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs text-amber-400 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver</span> PIX & QR
            </button>

            <button
              onClick={handleCopyPix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <span className="font-mono font-bold text-amber-400">{DEFAULT_PIX_KEY}</span>
              {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* ===================== LINK PARA ENVIAR AOS BARBEIROS (CADASTRO) ===================== */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base text-white">
                  Link de Cadastro para Novos Barbeiros
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  ⚡ Ativação Automática
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-xl">
                Envie este link para qualquer barbeiro que queira usar o sistema. Ele preenche os dados, escolhe o dia da mensalidade e já começa a usar na hora sem você precisar aprovar manualmente.
              </p>
              <div className="pt-1">
                <span className="font-mono text-xs font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 inline-block truncate max-w-xs sm:max-w-md">
                  {registerUrl}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={handleCopyRegisterLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md ${
                copiedRegisterLink
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {copiedRegisterLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedRegisterLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <a
              href="/cadastrar"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Testar Cadastro</span>
            </a>
          </div>
        </div>

        {/* ===================== PREVIEW DO PIX & BANCO INTER ===================== */}
        {showPixPreview && (
          <div className="p-4 rounded-3xl bg-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-2xl bg-white shadow-md border border-amber-500/40 shrink-0">
                <img
                  src={DEFAULT_PIX_QRCODE}
                  alt="QR Code Banco Inter"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-white text-sm">QR Code & Chave PIX Ativos</h4>
                <p className="text-slate-400">
                  Titular: <strong className="text-amber-300">{DEFAULT_PIX_NAME}</strong> (Banco Inter)
                </p>
                <p className="text-slate-400">
                  Chave CPF: <strong className="font-mono text-white">{DEFAULT_PIX_KEY}</strong>
                </p>
                <p className="text-[11px] text-emerald-400 font-medium">
                  Configurado para R$ {(baseFee).toFixed(2).replace('.', ',')} por barbearia
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPixPreview(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer self-end sm:self-center"
            >
              Fechar Preview
            </button>
          </div>
        )}

        {/* ===================== CARDS DE MÉTRICAS (KPIS) + CONFIGURAÇÃO DA MENSALIDADE BASE ===================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Barbearias</span>
              <Store className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">{totalShops}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">cadastradas no total</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Faturamento (MRR)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">
              R$ {totalMRR.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">recorrente por mês</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Em Dia</span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">{activeShops}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">assinaturas ativas</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Inadimplentes / Pendentes</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400">{overdueShops}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{blockedShops} bloqueadas</p>
          </div>
        </div>

        {/* ===================== CONFIGURADOR DA MENSALIDADE BASE ===================== */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Preço Base da Mensalidade</h3>
              <p className="text-slate-400 text-xs">
                Valor cobrado por padrão para novas barbearias cadastradas.
              </p>
            </div>
          </div>

          {!isEditingBaseFee ? (
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-lg font-black text-amber-400">
                R$ {baseFee.toFixed(2).replace('.', ',')} / mês
              </span>
              <button
                onClick={() => {
                  setNewBaseFeeInput(baseFee)
                  setIsEditingBaseFee(true)
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Alterar Valor</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveBaseFee} className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="5"
                min="10"
                value={newBaseFeeInput}
                onChange={(e) => setNewBaseFeeInput(Number(e.target.value))}
                className="w-24 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-300 font-bold text-sm text-right focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBaseFee(false)}
                className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs cursor-pointer"
              >
                ✕
              </button>
            </form>
          )}
        </div>

        {/* ===================== FILTROS E BUSCA ===================== */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, link ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none text-xs text-white"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'active', label: 'Em Dia' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'overdue', label: 'Atrasadas' },
              { id: 'blocked', label: 'Bloqueadas' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  filterStatus === st.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===================== LISTA DE CLIENTES / BARBEARIAS ===================== */}
        <div className="space-y-3">
          {filteredShops.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
              Nenhuma barbearia encontrada com este filtro.
            </div>
          ) : (
            filteredShops.map((shop) => {
              const isBlocked = shop.subscription_status === 'blocked'
              const isOverdue = shop.subscription_status === 'overdue'
              const isPending = shop.subscription_status === 'pending'
              const isActive = shop.subscription_status === 'active'

              return (
                <div
                  key={shop.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isBlocked
                      ? 'bg-rose-950/20 border-rose-900/60'
                      : isOverdue
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Informações da Barbearia */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                        <img
                          src={shop.logo_url}
                          alt={shop.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-white">{shop.name}</h3>

                          {shop.owner_name && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              (Dono: {shop.owner_name})
                            </span>
                          )}

                          {/* Badge de Status */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : isOverdue
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isActive
                              ? 'Em Dia (Pago)'
                              : isPending
                              ? 'Vencendo'
                              : isOverdue
                              ? 'Inadimplente'
                              : 'Bloqueado'}
                          </span>
                        </div>

                        {/* Link e Detalhes */}
                        <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400 flex-wrap">
                          <span className="font-mono text-amber-300">/{shop.slug}</span>
                          <span>•</span>
                          <span>
                            Mensalidade: <strong className="text-white">R$ {(shop.monthly_fee || 50).toFixed(2).replace('.', ',')}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Vencimento: <strong className="text-slate-200">Dia {shop.due_day || 10}</strong> (Próx: {shop.next_billing_date || 'A definir'})
                          </span>
                        </div>

                        {shop.address && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs sm:max-w-md">
                            {shop.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ações Rápidas (Mobile & Desktop) */}
                    <div className="flex items-center gap-2 flex-wrap self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 w-full sm:w-auto justify-end">
                      {/* Abrir Link do Cliente */}
                      <button
                        onClick={() => onNavigateToShop ? onNavigateToShop(shop.slug) : window.open(`/${shop.slug}`, '_blank')}
                        title="Ver Link do Cliente"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {/* Cobrar no WhatsApp */}
                      <a
                        href={getCobrarWhatsappUrl(shop)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Cobrar via WhatsApp"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Cobrar</span>
                      </a>

                      {/* Confirmar Pagamento PIX */}
                      <button
                        onClick={() => handleConfirmPayment(shop.id)}
                        title="Marcar como Pago e Prorrogar +30 dias"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pago (+30d)</span>
                      </button>

                      {/* Editar Mensalidade e Dia */}
                      <button
                        onClick={() => {
                          setEditingShop(shop)
                          setEditFee(shop.monthly_fee || 50)
                          setEditDueDay(shop.due_day || 10)
                        }}
                        title="Editar Mensalidade"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Bloquear / Desbloquear */}
                      <button
                        onClick={() => handleToggleBlock(shop.id)}
                        title={isBlocked ? 'Desbloquear Barbearia' : 'Bloquear por Inadimplência'}
                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isBlocked
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Excluir Barbearia */}
                      <button
                        onClick={() => {
                          setShopToDelete(shop)
                          setDeleteInputText('')
                        }}
                        title="Excluir Definitivamente"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-700 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* ===================== MODAL DE EDIÇÃO DE MENSALIDADE INDIVIDUAL ===================== */}
      {editingShop && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12151f] border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-1">
              Editar Mensalidade
            </h3>
            <p className="text-xs text-slate-400 mb-4">{editingShop.name}</p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Valor da Mensalidade (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={editFee}
                    onChange={(e) => setEditFee(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Dia de Vencimento do Mês (1 a 31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editDueDay}
                  onChange={(e) => setEditDueDay(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingShop(null)}
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

      {/* ===================== MODAL DE EXCLUSÃO COM TRAVA DE SEGURANÇA ===================== */}
      {shopToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12151f] border border-rose-500/50 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-white">Excluir Conta da Barbearia</h3>
              <p className="text-xs text-slate-400">
                Deseja realmente apagar <strong>{shopToDelete.name}</strong> da plataforma?
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-semibold">
                Digite exatamente <strong className="text-rose-400">Excluir</strong> para confirmar:
              </label>
              <input
                type="text"
                placeholder="Excluir"
                value={deleteInputText}
                onChange={(e) => setDeleteInputText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-rose-500/40 text-white font-mono text-center focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShopToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={deleteInputText.trim() !== 'Excluir'}
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs cursor-pointer transition-all"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
