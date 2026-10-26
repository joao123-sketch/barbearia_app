import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scissors,
  CheckCircle2,
  Store,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Check,
  Copy,
  Camera,
  Trash2,
  Sparkles,
  Calendar
} from 'lucide-react'
import confetti from 'canvas-confetti'
import type { Barbershop, Service } from '../types'
import { DEFAULT_PIX_KEY } from '../lib/mockData'

const InstagramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

const DEFAULT_SHOP_LOGO = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80'

interface BarberOnboardingProps {
  onRegisterBarbershop: (shop: Barbershop, services: Service[]) => void
}

export const BarberOnboarding: React.FC<BarberOnboardingProps> = ({
  onRegisterBarbershop
}) => {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dados do Barbeiro e Estabelecimento
  const [ownerName, setOwnerName] = useState('')
  const [shopName, setShopName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [slogan, setSlogan] = useState('Tradição, estilo e o melhor corte da região.')
  const [instagram, setInstagram] = useState('')
  const [dueDay, setDueDay] = useState<number>(10)

  // Logo da Barbearia (se tiver)
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_SHOP_LOGO)
  const [hasCustomLogo, setHasCustomLogo] = useState(false)

  const [copiedLink, setCopiedLink] = useState(false)

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

  // Upload de Logo da Barbearia
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('A foto da logo deve ter menos de 4MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoUrl(reader.result as string)
        setHasCustomLogo(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveCustomLogo = () => {
    setLogoUrl(DEFAULT_SHOP_LOGO)
    setHasCustomLogo(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Conclusão e ativação imediata (cadastro direto sem serviços obrigatórios)
  const handleFinishRegistration = (e: React.FormEvent) => {
    e.preventDefault()

    if (!ownerName.trim()) {
      alert('Por favor, informe o seu nome completo.')
      return
    }
    if (!shopName.trim()) {
      alert('Por favor, informe o nome da sua barbearia.')
      return
    }
    if (phone.replace(/\D/g, '').length < 10) {
      alert('Por favor, informe um WhatsApp válido com DDD.')
      return
    }
    if (!password.trim() || password.length < 4) {
      alert('Por favor, crie uma senha de acesso com no mínimo 4 dígitos.')
      return
    }
    if (!address.trim()) {
      alert('Por favor, informe o endereço da barbearia.')
      return
    }
    // E-mail opcional
    if (email.trim() && !email.includes('@')) {
      alert('Por favor, informe um e-mail válido ou deixe o campo em branco.')
      return
    }

    const newShopId = 'shop-' + Date.now()
    const today = new Date()
    let billingYear = today.getFullYear()
    let billingMonth = today.getMonth() // 0-indexed
    if (today.getDate() >= dueDay) {
      billingMonth += 1
      if (billingMonth > 11) {
        billingMonth = 0
        billingYear += 1
      }
    }
    const nextDate = new Date(billingYear, billingMonth, dueDay)
    const nextDateStr = nextDate.toISOString().split('T')[0]

    const finalSlug = slug || shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'minha-barbearia'

    // Formatar Instagram limpo
    let cleanInstagram = instagram.trim()
    if (cleanInstagram) {
      cleanInstagram = cleanInstagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '')
      cleanInstagram = `@${cleanInstagram}`
    }

    const newBarbershop: Barbershop = {
      id: newShopId,
      name: shopName.trim(),
      slug: finalSlug,
      owner_name: ownerName.trim(),
      owner_email: email.trim() || undefined,
      slogan: slogan.trim(),
      description: 'Atendimento de alta qualidade, conforto e estilo.',
      logo_url: logoUrl,
      banner_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
      phone_whatsapp: phone.replace(/\D/g, '') || '5511999998888',
      address: address.trim(),
      instagram: cleanInstagram || undefined,
      theme_color: '#EAB308',
      created_at: new Date().toISOString(),
      monthly_fee: 50.00,
      subscription_status: 'active', // ATIVAÇÃO IMEDIATA SEM APROVAÇÃO MANUAL
      due_day: Number(dueDay) || 10,
      next_billing_date: nextDateStr,
      pix_key: DEFAULT_PIX_KEY,
      blocked_dates: []
    }

    // Não cadastra serviços iniciais agora; o barbeiro cadastra diretamente no painel
    const createdServices: Service[] = []

    // Salvar sessão do barbeiro (login com WhatsApp e Senha)
    localStorage.setItem('barber_current_user', JSON.stringify({
      phone: phone.replace(/\D/g, ''),
      email: email.trim() || undefined,
      password: password.trim(),
      owner_name: ownerName.trim(),
      shop_id: newShopId,
      shop_slug: finalSlug
    }))

    onRegisterBarbershop(newBarbershop, createdServices)
    setStep(2)

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      })
    } catch {
      // ignore
    }
  }

  const clientUrl = `${window.location.origin}/${slug || 'sua-barbearia'}`

  const handleCopyClientLink = () => {
    navigator.clipboard.writeText(clientUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col justify-center px-4 py-8 select-none">
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Header com Logo e Título */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <Scissors className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cadastrar Minha Barbearia
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Cadastre seu negócio em menos de 1 minuto e comece a receber agendamentos. Os serviços você adiciona direto no seu painel.
          </p>
        </div>

        {/* ===================== PASSO 1: FORMULÁRIO COMPLETO & RÁPIDO ===================== */}
        {step === 1 && (
          <form onSubmit={handleFinishRegistration} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Store className="w-4 h-4" />
              <span>Informações do seu Negócio</span>
            </div>

            {/* FOTO / LOGO DO NEGÓCIO */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-3.5">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-slate-900 shrink-0 shadow-md">
                <img
                  src={logoUrl}
                  alt="Logo da Barbearia"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">
                    Logo / Foto da Barbearia
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
                  {hasCustomLogo ? 'Sua logo personalizada carregada!' : 'Se tiver a logo no celular, envie agora. Se não tiver, usaremos uma foto moderna.'}
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
              {/* Nome do Responsável / Barbeiro */}
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
                  <span>Nome da Barbearia *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Barbearia Black Diamond"
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
                    placeholder="Mínimo 4 dígitos"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
                  />
                  <span className="text-[10px] text-amber-300/80 mt-1 block">
                    Usada junto com seu WhatsApp para login.
                  </span>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Endereço Completo & Bairro/Cidade *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Brasil, 450 - Centro"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
                />
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
                    <span>E-mail (Opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="seuemail@gmail.com (opcional)"
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
                <p className="text-[11px] text-slate-400">
                  A mensalidade fixa é de R$ 50,00. Escolha o dia do mês que prefere pagar:
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

              {/* Slogan */}
              <div>
                <label className="block text-slate-400 mb-1">
                  Frase de Destaque / Slogan da Barbearia (Opcional):
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90">
              <p className="font-bold text-amber-300">⚡ Ativação Imediata</p>
              <p className="text-[11px] mt-0.5">
                Sua barbearia será criada na hora. Você poderá cadastrar seus cortes e preços com calma diretamente no seu painel.
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
                onClick={() => navigate('/login')}
                className="text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Já tem cadastro? <strong className="text-amber-400 underline">Entrar com WhatsApp e Senha</strong>
              </button>
            </div>
          </form>
        )}

        {/* ===================== PASSO 2: SUCESSO E LINK PRONTO ===================== */}
        {step === 2 && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/40 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Barbearia Criada com Sucesso!</h2>
              <p className="text-xs text-slate-300 mt-1">
                Parabéns, <strong>{ownerName}</strong>! A <strong>{shopName}</strong> já está ativa.
              </p>
              <p className="text-xs text-amber-400 font-semibold mt-1">
                Agora acesse seu painel para cadastrar seus serviços e preços!
              </p>
            </div>

            {/* Card com o Link Oficial */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 text-left text-xs space-y-2">
              <span className="text-slate-400 text-[11px] block">Seu link oficial de agendamentos:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-400 font-mono font-bold block truncate">
                  {clientUrl}
                </span>
                <button
                  onClick={handleCopyClientLink}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Ir para o Painel e Cadastrar Serviços
              </button>

              <button
                onClick={() => navigate(`/${slug}`)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 cursor-pointer"
              >
                Ver Página do Cliente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
