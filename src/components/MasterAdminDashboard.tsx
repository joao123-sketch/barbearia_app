import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  UserPlus,
  Camera,
  Sun,
  Moon
} from 'lucide-react'
import type { Barbershop } from '../types'
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '../lib/platform'
import { useSession } from '../lib/auth'
import {
  adminConfirmPayment,
  adminScheduleFee,
  adminSetShopFee,
  adminSetBlocked,
  deleteShop,
  fetchAllShops,
  fetchPlatformSettings,
  friendlyError,
  isPlatformAdmin,
  savePlatformSettingsDb
} from '../lib/db'
import { TRIAL_DAYS, formatBR, formatMoney, getBillingState } from '../lib/billing'
import { normalizePhone, toWaNumber } from '../lib/phone'
import { fileToResizedDataUrl } from '../lib/image'
import { buildShopTheme, getModeFor, shopThemeAttrs, useShopChrome, type ThemeMode } from '../lib/shopTheme'

// Entrada do painel geral: só o administrador da plataforma (conta marcada no banco) enxerga as contas
export const MasterAdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { session, ready } = useSession()
  const [state, setState] = useState<'loading' | 'denied' | 'ready'>('loading')
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS)

  // Mesmo visual do estilo "neutro", com opção de claro/escuro lembrada neste aparelho
  const [override, setOverride] = useState<ThemeMode | null>(() => {
    try {
      const saved = localStorage.getItem('master_theme')
      return saved === 'light' || saved === 'dark' ? saved : null
    } catch {
      return null
    }
  })
  const mode = getModeFor('neutro', override)
  useShopChrome('neutro', mode)
  const toggleMode = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light'
    setOverride(next)
    try {
      localStorage.setItem('master_theme', next)
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  }

  const reload = async () => {
    const [shops, platform] = await Promise.all([fetchAllShops(), fetchPlatformSettings()])
    setBarbershops(shops)
    if (platform) setSettings(platform)
  }

  useEffect(() => {
    if (!ready) return
    if (!session) {
      navigate('/login?next=/master', { replace: true })
      return
    }
    let cancelled = false
    ;(async () => {
      if (!(await isPlatformAdmin())) {
        if (!cancelled) setState('denied')
        return
      }
      await reload()
      if (!cancelled) setState('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [ready, session])

  const themed = (children: React.ReactNode) => (
    <div {...shopThemeAttrs('neutro', mode)} style={buildShopTheme('neutro', mode)} className="min-h-screen bg-slate-950">
      {children}
    </div>
  )

  if (state === 'loading') {
    return themed(<div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm">Carregando...</div>)
  }
  if (state === 'denied') {
    return themed(
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-bold">Acesso restrito</p>
        <p className="text-sm text-slate-400 max-w-xs">Esta área é exclusiva do administrador da plataforma.</p>
        <button onClick={() => navigate('/admin')} className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm cursor-pointer">
          Ir para o meu painel
        </button>
      </div>
    )
  }

  return themed(
    <MasterPanel
      barbershops={barbershops}
      settings={settings}
      onSettings={setSettings}
      reload={reload}
      isLight={mode === 'light'}
      onToggleTheme={toggleMode}
    />
  )
}

interface MasterPanelProps {
  barbershops: Barbershop[]
  settings: PlatformSettings
  onSettings: (s: PlatformSettings) => void
  reload: () => Promise<void>
  isLight: boolean
  onToggleTheme: () => void
}

const MasterPanel: React.FC<MasterPanelProps> = ({ barbershops, settings, onSettings, reload, isLight, onToggleTheme }) => {
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action()
      await reload()
      return true
    } catch (err) {
      alert(friendlyError(err instanceof Error ? err.message : String(err)))
      return false
    }
  }

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

  // Cobrança da plataforma: mensalidade, chave PIX, titular e QR Code
  const [draft, setDraft] = useState<PlatformSettings>(settings)
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [applyFeeToAll, setApplyFeeToAll] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Modal de edição individual de barbearia
  const [editingShop, setEditingShop] = useState<Barbershop | null>(null)
  const [editFee, setEditFee] = useState<number>(50)
  const [editApplyNow, setEditApplyNow] = useState(false)

  // Modal de Exclusão de Barbearia com trava de segurança
  const [shopToDelete, setShopToDelete] = useState<Barbershop | null>(null)
  const [deleteInputText, setDeleteInputText] = useState('')

  // Visualizar QR Code PIX
  const [showPixPreview, setShowPixPreview] = useState(false)

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean: PlatformSettings = {
      monthly_fee: Number(draft.monthly_fee) > 0 ? Math.round(Number(draft.monthly_fee) * 100) / 100 : settings.monthly_fee,
      pix_key: draft.pix_key.trim(),
      pix_name: draft.pix_name.trim(),
      pix_bank: draft.pix_bank.trim(),
      pix_qrcode: draft.pix_qrcode,
      contact_whatsapp: normalizePhone(draft.contact_whatsapp)
    }
    if (!clean.pix_key) {
      alert('Informe a chave PIX.')
      return
    }
    const ok = await run(async () => {
      await savePlatformSettingsDb(clean)
      // Novo valor vale para quem se cadastrar daqui para frente; nas contas atuais só se marcado, no próximo pagamento
      if (applyFeeToAll && clean.monthly_fee !== settings.monthly_fee) await adminScheduleFee(clean.monthly_fee)
    })
    if (!ok) return
    onSettings(clean)
    setApplyFeeToAll(false)
    setIsEditingSettings(false)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 3000)
  }

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const qr = await fileToResizedDataUrl(file, 700, 1, 'image/png')
      setDraft((d) => ({ ...d, pix_qrcode: qr }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível usar esta imagem.')
    }
  }

  // Copiar chave PIX
  const handleCopyPix = () => {
    navigator.clipboard.writeText(settings.pix_key)
    setCopiedPix(true)
    setTimeout(() => setCopiedPix(false), 2000)
  }

  // Filtragem
  const filteredShops = useMemo(() => {
    return barbershops.filter((shop) => {
      const matchesSearch =
        shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.phone_whatsapp.includes(searchTerm.replace(/\D/g, '') || searchTerm)

      if (filterStatus === 'all') return matchesSearch
      return matchesSearch && getBillingState(shop).status === filterStatus
    })
  }, [barbershops, searchTerm, filterStatus])

  // KPIs
  const totalShops = barbershops.length
  const trialShops = barbershops.filter((s) => getBillingState(s).status === 'trial').length
  const paidShops = barbershops.filter((s) => getBillingState(s).status === 'active').length
  const expiredShops = barbershops.filter((s) => getBillingState(s).status === 'expired').length
  const blockedShops = barbershops.filter((s) => getBillingState(s).status === 'blocked').length
  // Receita recorrente: só quem está com o período pago em dia
  const totalMRR = barbershops
    .filter((s) => getBillingState(s).status === 'active')
    .reduce((acc, curr) => acc + (curr.monthly_fee || settings.monthly_fee), 0)

  // Confirmar pagamento PIX: o banco libera mais 30 dias (a partir de hoje, ou do fim do período atual se ainda vigente)
  const handleConfirmPayment = async (shopId: string) => {
    if (await run(() => adminConfirmPayment(shopId))) alert('Pagamento registrado! Acesso liberado por mais 30 dias.')
  }

  // Alternar Bloqueio / Desbloqueio
  const handleToggleBlock = async (shopId: string) => {
    const shop = barbershops.find((s) => s.id === shopId)
    if (!shop) return

    const blocking = shop.subscription_status !== 'blocked'
    const confirmMsg = blocking
      ? `Tem certeza que deseja bloquear "${shop.name}"? O link público e o painel dele serão suspensos.`
      : `Deseja reativar o acesso de "${shop.name}"?`

    if (window.confirm(confirmMsg)) await run(() => adminSetBlocked(shopId, blocking))
  }

  // Excluir conta com trava
  const handleExecuteDelete = async () => {
    if (!shopToDelete) return
    if (deleteInputText.trim() !== 'Excluir') {
      alert('Digite exatamente "Excluir" para confirmar.')
      return
    }
    if (await run(() => deleteShop(shopToDelete.id))) {
      setShopToDelete(null)
      setDeleteInputText('')
    }
  }

  // Novo valor para uma conta: vale a partir do próximo pagamento
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingShop) return

    const newFee = Number(editFee)
    if (!(newFee > 0)) {
      alert('Informe um valor maior que zero.')
      return
    }
    const target = editingShop
    const applyNow = editApplyNow
    if (await run(() => adminSetShopFee(target.id, Math.round(newFee * 100) / 100, applyNow))) {
      setEditingShop(null)
      alert(
        applyNow
          ? `Mensalidade de ${target.name} alterada para R$ ${formatMoney(newFee)}.`
          : `Mensalidade de ${target.name} será R$ ${formatMoney(newFee)} a partir do próximo pagamento.`
      )
    }
  }

  // Montar link do WhatsApp para cobrar o barbeiro
  const getCobrarWhatsappUrl = (shop: Barbershop) => {
    const msg = `Olá, equipe da *${shop.name}*! Tudo bem?\n\n` +
      `Passando para lembrar do pagamento antecipado do seu sistema de agendamentos no valor de *R$ ${formatMoney(shop.monthly_fee || settings.monthly_fee)}*.\n\n` +
      `🔑 *Chave PIX:* ${settings.pix_key}\n` +
      `👤 *Titular:* ${settings.pix_name} (${settings.pix_bank})\n\n` +
      `Assim que realizar o pagamento, por favor envie o comprovante por aqui para mantermos seu sistema 100% ativo. Obrigado!`

    return `https://wa.me/${toWaNumber(shop.phone_whatsapp)}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 select-none">
      {/* ===================== TOPO MASTER ADMIN (PRIVADO) ===================== */}
      <header className="safe-top sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 pb-3.5">
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
                Gestão geral de contas, pagamentos e recebíveis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              title={isLight ? 'Modo escuro' : 'Modo claro'}
              aria-label={isLight ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 cursor-pointer"
            >
              {isLight ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
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
              <span className="font-mono font-bold text-amber-400">{settings.pix_key}</span>
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
                {`Envie este link para qualquer barbeiro que queira usar o sistema. Ele cria a conta, ganha ${TRIAL_DAYS} dias grátis e já começa a usar na hora, sem você precisar aprovar. Depois, o acesso é pré-pago por PIX.`}
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
                  src={settings.pix_qrcode}
                  alt="QR Code Banco Inter"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-white text-sm">QR Code & Chave PIX Ativos</h4>
                <p className="text-slate-400">
                  Titular: <strong className="text-amber-300">{settings.pix_name}</strong> ({settings.pix_bank})
                </p>
                <p className="text-slate-400">
                  Chave PIX: <strong className="font-mono text-white">{settings.pix_key}</strong>
                </p>
                <p className="text-[11px] text-emerald-400 font-medium">
                  Mensalidade de R$ {formatMoney(settings.monthly_fee)} por negócio
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
              <span className="text-xs font-medium">Contas</span>
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
            <p className="text-[10px] text-slate-400 mt-0.5">de quem já pagou</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Pagantes</span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">{paidShops}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">{trialShops} em teste grátis</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Vencidos</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400">{expiredShops}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{blockedShops} bloqueadas</p>
          </div>
        </div>

        {/* ===================== COBRANÇA: MENSALIDADE, PIX E QR CODE ===================== */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Cobrança e PIX</h3>
                <p className="text-slate-400 text-xs">
                  Valor, chave e QR Code que aparecem para os donos na hora de pagar.
                </p>
              </div>
            </div>
            {!isEditingSettings && (
              <button
                onClick={() => {
                  setDraft(settings)
                  setIsEditingSettings(true)
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Editar</span>
              </button>
            )}
          </div>

          {settingsSaved && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
              Salvo! Os donos já veem os novos dados.
            </div>
          )}

          {!isEditingSettings ? (
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
              <div className="p-1.5 rounded-xl bg-white w-fit">
                <img src={settings.pix_qrcode} alt="QR Code PIX" className="w-24 h-24 object-contain" />
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <dt className="text-slate-400 text-[11px]">Mensalidade</dt>
                  <dd className="text-lg font-black text-amber-400">R$ {formatMoney(settings.monthly_fee)} / mês</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[11px]">Chave PIX</dt>
                  <dd className="font-mono font-bold text-white break-all">{settings.pix_key}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[11px]">Titular</dt>
                  <dd className="text-white">{settings.pix_name}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[11px]">Banco</dt>
                  <dd className="text-white">{settings.pix_bank}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-400 text-[11px]">WhatsApp para comprovantes</dt>
                  <dd className="text-white">{settings.contact_whatsapp || 'Não informado (o botão de comprovante fica oculto para os donos)'}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mensalidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={draft.monthly_fee}
                    onChange={(e) => setDraft({ ...draft, monthly_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:outline-none text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chave PIX</label>
                  <input
                    type="text"
                    required
                    value={draft.pix_key}
                    onChange={(e) => setDraft({ ...draft, pix_key: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:outline-none text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome do titular</label>
                  <input
                    type="text"
                    value={draft.pix_name}
                    onChange={(e) => setDraft({ ...draft, pix_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:outline-none text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Seu WhatsApp para receber comprovantes</label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={draft.contact_whatsapp}
                    onChange={(e) => setDraft({ ...draft, contact_whatsapp: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Banco</label>
                  <input
                    type="text"
                    value={draft.pix_bank}
                    onChange={(e) => setDraft({ ...draft, pix_bank: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:outline-none text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-white shrink-0">
                  <img src={draft.pix_qrcode} alt="QR Code PIX" className="w-20 h-20 object-contain" />
                </div>
                <div className="space-y-1.5">
                  <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" id="master-qr-upload" />
                  <label
                    htmlFor="master-qr-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer active:scale-95 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Trocar QR Code</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Envie o print ou a imagem do QR Code do seu PIX.</p>
                </div>
              </div>

              {Number(draft.monthly_fee) !== settings.monthly_fee && (
                <label className="flex items-start gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyFeeToAll}
                    onChange={(e) => setApplyFeeToAll(e.target.checked)}
                    className="accent-amber-500 w-4 h-4 mt-0.5"
                  />
                  <span>Aplicar o novo valor também às contas atuais, a partir do próximo pagamento de cada uma (substitui valores personalizados). Desmarcado: só vale para quem se cadastrar daqui para frente.</span>
                </label>
              )}

              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer">
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingSettings(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
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
              { id: 'trial', label: 'Em teste' },
              { id: 'active', label: 'Pagas' },
              { id: 'expired', label: 'Vencidas' },
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
              const billing = getBillingState(shop)
              const isBlocked = billing.status === 'blocked'
              const isExpired = billing.status === 'expired'
              const isTrial = billing.status === 'trial'
              const isActive = billing.status === 'active'

              return (
                <div
                  key={shop.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isBlocked
                      ? 'bg-rose-950/20 border-rose-900/60'
                      : isExpired
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Informações da Barbearia */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                        {shop.logo_url ? (
                          <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-amber-400 font-black">
                            {shop.name.trim().charAt(0).toUpperCase()}
                          </div>
                        )}
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
                                : isTrial
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : isExpired
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isActive
                              ? 'Pago'
                              : isTrial
                              ? `Teste grátis (${billing.daysLeft}d)`
                              : isExpired
                              ? 'Vencido'
                              : 'Bloqueado'}
                          </span>
                        </div>

                        {/* Link e Detalhes */}
                        <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400 flex-wrap">
                          <span className="font-mono text-amber-300">/{shop.slug}</span>
                          <span>•</span>
                          <span>
                            Mensalidade: <strong className="text-white">R$ {formatMoney(shop.monthly_fee || settings.monthly_fee)}</strong>
                            {shop.monthly_fee > 0 && shop.monthly_fee !== settings.monthly_fee && (
                              <span className="ml-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">
                                personalizada
                              </span>
                            )}
                            {shop.next_monthly_fee && shop.next_monthly_fee !== shop.monthly_fee && (
                              <span className="ml-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">
                                ➔ R$ {formatMoney(shop.next_monthly_fee)} no próximo pagamento
                              </span>
                            )}
                          </span>
                          <span>•</span>
                          <span>
                            {isTrial ? 'Teste até' : isActive ? 'Pago até' : 'Venceu em'}: <strong className="text-slate-200">{formatBR(billing.dueDate)}</strong>
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
                        onClick={() => window.open(`/b/${shop.slug}`, '_blank')}
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
                        title="Registrar pagamento e liberar mais 30 dias"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Recebi (+30d)</span>
                      </button>

                      {/* Editar Mensalidade e Dia */}
                      <button
                        onClick={() => {
                          setEditingShop(shop)
                          setEditApplyNow(false)
                          setEditFee(shop.monthly_fee || settings.monthly_fee)
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
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-2xl">
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
                    step="0.01"
                    min="0"
                    value={editFee}
                    onChange={(e) => setEditFee(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Valor padrão atual: R$ {formatMoney(settings.monthly_fee)}. Aqui você define um valor só para esta conta.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-start gap-2 text-slate-200 cursor-pointer">
                  <input type="radio" name="fee-when" checked={!editApplyNow} onChange={() => setEditApplyNow(false)} className="accent-amber-500 mt-0.5" />
                  <span>A partir do <strong>próximo pagamento</strong> (o período já pago não muda)</span>
                </label>
                <label className="flex items-start gap-2 text-slate-200 cursor-pointer">
                  <input type="radio" name="fee-when" checked={editApplyNow} onChange={() => setEditApplyNow(true)} className="accent-amber-500 mt-0.5" />
                  <span>Já vale <strong>agora</strong></span>
                </label>
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
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/50 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
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
