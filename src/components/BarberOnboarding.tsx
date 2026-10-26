import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scissors,
  Store,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Camera,
  Trash2,
  Sparkles,
  Calendar,
  Users,
  Palette
} from 'lucide-react'
import type { Barbershop, Service, ShopStylePreset, BusinessType } from '../types'
import { fileToResizedDataUrl } from '../lib/image'
import { createAccount, findAccount, startSession } from '../lib/auth'
import { getTerms } from '../lib/terms'
import { DEFAULT_PIX_KEY } from '../lib/mockData'
import { STYLE_PRESETS, STYLE_PRESET_ORDER } from '../lib/stylePresets'
import { buildShopTheme, getModeFor, shopThemeAttrs, useShopChrome } from '../lib/shopTheme'

const InstagramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

interface BarberOnboardingProps {
  onRegisterBarbershop: (shop: Barbershop, services: Service[], initialTeamNames?: string[]) => void
  onBack: () => void
}

export const BarberOnboarding: React.FC<BarberOnboardingProps> = ({
  onRegisterBarbershop,
  onBack
}) => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dados do Barbeiro e Estabelecimento
  const [ownerName, setOwnerName] = useState('')
  const [shopName, setShopName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [referencePoint, setReferencePoint] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [slogan, setSlogan] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const terms = getTerms(businessType ?? undefined)
  const [instagram, setInstagram] = useState('')
  const [dueDay, setDueDay] = useState<number>(10)

  // Estilo Visual Escolhido
  const [stylePreset, setStylePreset] = useState<ShopStylePreset>('neutro')
  useShopChrome(stylePreset, getModeFor(stylePreset, null))

  // Equipe / Profissionais
  const [teamType, setTeamType] = useState<'solo' | 'team'>('solo')
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [newMemberName, setNewMemberName] = useState('')

  const handleAddTeamMember = () => {
    if (!newMemberName.trim()) return
    setTeamMembers([...teamMembers, newMemberName.trim()])
    setNewMemberName('')
  }

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index))
  }

  // Logo da Barbearia (se tiver)
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [hasCustomLogo, setHasCustomLogo] = useState(false)

  // Gerar slug automaticamente ao digitar o nome da barbearia
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setShopName(val)
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
    setSlug(generatedSlug)
  }

  // Formatação de telefone / WhatsApp
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
    setPhone(value)
  }

  // Upload de Logo / Foto (reduzida para caber no armazenamento do aparelho)
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setLogoUrl(await fileToResizedDataUrl(file))
      setHasCustomLogo(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível usar esta imagem.')
    }
  }

  const handleRemoveCustomLogo = () => {
    setLogoUrl('')
    setHasCustomLogo(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Conclusão e ativação imediata (cadastro direto sem serviços obrigatórios)
  const handleFinishRegistration = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessType) {
      alert('Escolha se o seu negócio é uma barbearia ou um salão de beleza.')
      return
    }
    if (!ownerName.trim()) {
      alert('Por favor, informe o seu nome completo.')
      return
    }
    if (!shopName.trim()) {
      alert('Por favor, informe o nome do seu negócio.')
      return
    }
    if (phone.replace(/\D/g, '').length < 10) {
      alert('Por favor, informe um WhatsApp válido com DDD.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      alert('Informe um e-mail válido. Ele é usado para recuperar a sua senha.')
      return
    }
    if (password.length < 6) {
      alert('Crie uma senha com no mínimo 6 caracteres.')
      return
    }
    if (!street.trim()) {
      alert('Por favor, informe a rua / logradouro do seu negócio.')
      return
    }
    if (!number.trim()) {
      alert('Por favor, informe o número do estabelecimento (ou S/N).')
      return
    }
    if (!neighborhood.trim()) {
      alert('Por favor, informe o bairro do seu negócio.')
      return
    }
    if (!city.trim()) {
      alert('Por favor, informe a cidade e estado do seu negócio.')
      return
    }
    if (findAccount(email) || findAccount(phone)) {
      alert('Já existe uma conta com este e-mail ou WhatsApp. Volte e entre com a sua senha.')
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')

    // RECONHECIMENTO DE CADASTRO E PREVENÇÃO DE FRAUDE (Anti-Trial Abuser)
    const auditRaw = localStorage.getItem('barber_audit_history')
    let auditList: Array<{ phone: string; shop_name: string; created_at: string; trial_used: boolean }> = []
    if (auditRaw) {
      try {
        auditList = JSON.parse(auditRaw)
      } catch {
        auditList = []
      }
    }
    const previousRecord = auditList.find((a) => a.phone === cleanPhone)
    let initialStatus: import('../types').SubscriptionStatus = 'active'

    if (previousRecord) {
      const confirmReactivation = window.confirm(
        '⚠️ Identificamos que este número de WhatsApp já possuiu uma conta anterior no BarberApp e já utilizou o período de avaliação.\n\n' +
        'Sua conta será reativada mediante o pagamento da primeira mensalidade de R$ 50,00 para liberar o link público.\n\nDeseja prosseguir?'
      )
      if (!confirmReactivation) return
      initialStatus = 'pending'
    } else {
      auditList.push({
        phone: cleanPhone,
        shop_name: shopName.trim(),
        created_at: new Date().toISOString(),
        trial_used: true
      })
      localStorage.setItem('barber_audit_history', JSON.stringify(auditList))
    }

    const newShopId = 'shop-' + Date.now()

    // COBRANÇA SEMPRE NO MÊS SEGUINTE (Mês + 1)
    const today = new Date()
    let billingYear = today.getFullYear()
    let billingMonth = today.getMonth() + 1 // Mês seguinte
    if (billingMonth > 11) {
      billingMonth = 0
      billingYear += 1
    }
    const daysInMonth = new Date(billingYear, billingMonth + 1, 0).getDate()
    const validDay = Math.min(dueDay, daysInMonth)
    const nextDate = new Date(billingYear, billingMonth, validDay)
    const nextDateStr = nextDate.toISOString().split('T')[0]

    const finalSlug = slug || shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'meu-negocio'

    // Formatar Instagram limpo
    let cleanInstagram = instagram.trim()
    if (cleanInstagram) {
      cleanInstagram = cleanInstagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '')
      cleanInstagram = `@${cleanInstagram}`
    }

    const fullAddress = `${street.trim()}, ${number.trim()} - ${neighborhood.trim()}, ${city.trim()}${referencePoint.trim() ? ` (${referencePoint.trim()})` : ''}`

    const newBarbershop: Barbershop = {
      id: newShopId,
      name: shopName.trim(),
      slug: finalSlug,
      owner_name: ownerName.trim(),
      business_type: businessType,
      owner_email: email.trim(),
      slogan: slogan.trim() || terms.defaultSlogan,
      description: 'Atendimento de alta qualidade, conforto e estilo.',
      logo_url: logoUrl || undefined,
      phone_whatsapp: cleanPhone,
      address: fullAddress,
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      reference_point: referencePoint.trim() || undefined,
      instagram: cleanInstagram || undefined,
      theme_color: '#EAB308',
      style_preset: stylePreset,
      created_at: new Date().toISOString(),
      monthly_fee: 50.00,
      subscription_status: initialStatus, // ATIVAÇÃO IMEDIATA (ou pending se já usou trial antes)
      due_day: Number(dueDay) || 10,
      next_billing_date: nextDateStr,
      pix_key: DEFAULT_PIX_KEY,
      blocked_dates: []
    }

    // Não cadastra serviços iniciais agora; o barbeiro cadastra diretamente no painel
    const createdServices: Service[] = []

    const account = {
      email: email.trim(),
      phone: cleanPhone,
      owner_name: ownerName.trim(),
      shop_id: newShopId,
      shop_slug: finalSlug
    }
    await createAccount(account, password)
    startSession({ ...account, password_hash: '' })

    onRegisterBarbershop(newBarbershop, createdServices, teamType === 'team' ? teamMembers : [])
    navigate('/admin')
  }

  return (
    <div
      {...shopThemeAttrs(stylePreset)}
      style={buildShopTheme(stylePreset, getModeFor(stylePreset, null))}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 select-none transition-colors"
    >
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Header com Logo e Título */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <Scissors className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cadastre seu negócio
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Cadastre em menos de 1 minuto e comece a receber agendamentos. Os serviços você adiciona direto no seu painel.
          </p>
        </div>

        {/* ===================== FORMULÁRIO DE CADASTRO ===================== */}
          <form onSubmit={handleFinishRegistration} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Store className="w-4 h-4" />
              <span>Informações do seu Negócio</span>
            </div>

              {/* TIPO DE NEGÓCIO */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                <label className="block text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                  <Store className="w-3.5 h-3.5 text-amber-400" />
                  <span>Qual é o seu negócio? *</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'barbearia', label: 'Barbearia', icon: '💈' },
                    { id: 'salao', label: 'Salão de Beleza', icon: '💇‍♀️' }
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBusinessType(opt.id)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        businessType === opt.id
                          ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xl block">{opt.icon}</span>
                      <span className={`text-xs font-bold ${businessType === opt.id ? 'text-white' : 'text-slate-300'}`}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ESTILO VISUAL DISPONÍVEL (PRESETS DE DESIGN) */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    <span>Escolha o visual do seu negócio</span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">
                    {STYLE_PRESETS[stylePreset].name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Toque num estilo e veja a página inteira mudar na hora. Você pode trocar depois no painel.
                </p>

                {/* Grid dos estilos */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {STYLE_PRESET_ORDER.map((pKey) => {
                    const preset = STYLE_PRESETS[pKey]
                    const isSelected = stylePreset === pKey
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => setStylePreset(pKey)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{preset.icon}</span>
                            <div>
                              <p className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                {preset.name}
                              </p>
                              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                {preset.subtitle}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>

                        {/* Amostras de cores */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1.5">
                            {preset.swatches.map((color, cIdx) => (
                              <span
                                key={cIdx}
                                className="w-4 h-4 rounded-full border border-black/30 shadow-inner"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="text-[9px] text-slate-400 italic truncate max-w-[140px]">
                            {preset.targetAudience.slice(0, 24)}...
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Prévia do Botão e Estilo Escolhido */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1 mt-1">
                  <span className="text-[10px] text-slate-400 block">Prévia dos botões do seu cliente:</span>
                  <div className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all ${STYLE_PRESETS[stylePreset].primaryButton}`}>
                    Agendar Horário • {STYLE_PRESETS[stylePreset].name}
                  </div>
                </div>
              </div>

            {/* FOTO / LOGO DO NEGÓCIO */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-3.5">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-slate-900 shrink-0 shadow-md">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400 bg-amber-500/10">
                    <Camera className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">
                    Logo / Foto do seu negócio
                  </span>
                  {hasCustomLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomLogo}
                      className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  {hasCustomLogo ? 'Imagem carregada!' : 'Envie a logo ou uma foto do seu celular. Se preferir, adicione depois no painel.'}
                </p>

                <div className="pt-0.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                    id="logo-upload-input"
                  />
                  <label
                    htmlFor="logo-upload-input"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{hasCustomLogo ? 'Trocar Foto/Logo' : 'Enviar Logo / Foto'}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Nome do responsável */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seu Nome *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
                />
              </div>

              {/* Nome da Barbearia */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>{`Nome ${businessType === 'salao' ? 'do Salão' : businessType === 'barbearia' ? 'da Barbearia' : 'do Negócio'} *`}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={businessType === 'salao' ? 'Ex: Studio Bela Vida' : 'Ex: Barbearia Black Diamond'}
                  value={shopName}
                  onChange={handleNameChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* WhatsApp */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp com DDD *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm font-mono"
                  />
                </div>

                {/* Senha de Acesso */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Criar Senha de Acesso *</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
                  />
                  <span className="text-[10px] text-amber-300/80 mt-1 block">
                    Você entra com seu e-mail ou WhatsApp e esta senha.
                  </span>
                </div>
              </div>

              {/* Endereço Detalhado em Campos Separados */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/80">
                <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs border-b border-slate-700/60 pb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Localização</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Rua / Avenida / Logradouro *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Rua das Flores"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Número *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 120 ou S/N"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Bairro *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Centro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Cidade / UF *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: São Paulo - SP"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ponto de Referência (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Em frente à praça central, ao lado da padaria"
                    value={referencePoint}
                    onChange={(e) => setReferencePoint(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                  />
                </div>
              </div>

              {/* Instagram & E-mail (Opcionais) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Instagram */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                    <span>Instagram (Opcional)</span>
                  </label>
                  <div className="flex items-center px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus-within:border-amber-500">
                    <span className="text-pink-400 font-bold mr-1">@</span>
                    <input
                      type="text"
                      placeholder="seunegocio"
                      value={instagram.replace('@', '')}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full bg-transparent text-white text-xs focus:outline-none placeholder-slate-500"
                    />
                  </div>
                </div>

                {/* E-mail (Opcional) */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>E-mail *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seuemail@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                  />
                </div>
              </div>

              {/* Slug / Link personalizado */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Link que os clientes vão acessar para agendar:
                </label>
                <div className="flex items-center px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-500 shrink-0 font-mono">app.com/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-transparent text-amber-300 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Dia de Pagamento da Mensalidade */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <label className="block text-slate-200 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Melhor dia para pagar a mensalidade: *</span>
                  </span>
                  <span className="text-amber-400 font-mono font-bold">Dia {dueDay}</span>
                </label>
                <p className="text-[11px] text-slate-300">
                  A mensalidade fixa é de R$ 50,00. Sua primeira cobrança só será realizada no <strong className="text-amber-400">mês seguinte</strong>, no dia que você escolher abaixo:
                </p>
                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  {[5, 10, 15, 20, 25, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDueDay(d)}
                      className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        dueDay === d
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* EQUIPE / PROFISSIONAIS DA BARBEARIA */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Como será o atendimento? *</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTeamType('solo')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      teamType === 'solo'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="font-bold text-xs text-white">Sou só eu</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Atendimento individual</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTeamType('team')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      teamType === 'team'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="font-bold text-xs text-white">Tenho Equipe</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Mais de 1 profissional</p>
                  </button>
                </div>

                {teamType === 'team' && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 animate-in fade-in">
                    <p className="text-[11px] text-slate-300">
                      Adicione os nomes dos outros profissionais do seu negócio (você pode editar ou adicionar mais depois):
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome do outro profissional"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTeamMember()
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddTeamMember}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95"
                      >
                        + Adicionar
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                        👑 {ownerName.trim() || 'Você (Principal)'}
                      </span>
                      {teamMembers.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] flex items-center gap-1.5"
                        >
                          <span>{m}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTeamMember(idx)}
                            className="text-slate-400 hover:text-rose-400 text-xs font-bold leading-none cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Slogan */}
              <div>
                <label className="block text-slate-400 mb-1">
                  Frase de destaque / slogan (Opcional):
                </label>
                <input
                  type="text"
                  value={slogan}
                  placeholder={terms.defaultSlogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90">
              <p className="font-bold text-amber-300">⚡ Ativação Imediata</p>
              <p className="text-[11px] mt-0.5">
                Sua conta será criada na hora e você entra direto no painel. Os serviços e preços você cadastra com calma por lá.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Concluir Cadastro & Acessar Painel</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Já tem conta? <strong className="text-amber-400 underline">Entrar</strong>
              </button>
            </div>
          </form>
      </div>
    </div>
  )
}
