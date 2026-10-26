import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scissors,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Store,
  DollarSign,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Check,
  Copy
} from 'lucide-react'
import confetti from 'canvas-confetti'
import type { Barbershop, Service } from '../types'
import { DEFAULT_PIX_KEY } from '../lib/mockData'

interface BarberOnboardingProps {
  onRegisterBarbershop: (shop: Barbershop, services: Service[]) => void
}

export const BarberOnboarding: React.FC<BarberOnboardingProps> = ({
  onRegisterBarbershop
}) => {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Dados Obrigatórios do Barbeiro e do Estabelecimento
  const [ownerName, setOwnerName] = useState('')
  const [shopName, setShopName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [slogan, setSlogan] = useState('Tradição, estilo e o melhor corte da região.')

  const [copiedLink, setCopiedLink] = useState(false)

  // Serviços Iniciais
  const [servicesList, setServicesList] = useState<Array<{ name: string; price: number; duration: number }>>([
    { name: 'Corte Tradicional / Degradê', price: 40, duration: 35 },
    { name: 'Barba Completa com Toalha Quente', price: 30, duration: 30 },
    { name: 'Combo Cabelo + Barba', price: 65, duration: 60 }
  ])

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

  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...servicesList]
    updated[index].price = newPrice
    setServicesList(updated)
  }

  // Validação do Passo 1
  const handleStep1Submit = (e: React.FormEvent) => {
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
    if (!address.trim()) {
      alert('Por favor, informe o endereço da barbearia.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      alert('Por favor, informe um e-mail válido para sua conta.')
      return
    }
    if (!password.trim() || password.length < 4) {
      alert('Por favor, crie uma senha de acesso com no mínimo 4 dígitos.')
      return
    }

    setStep(2)
  }

  // Conclusão e ativação imediata
  const handleFinish = () => {
    const newShopId = 'shop-' + Date.now()
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 30)

    const finalSlug = slug || shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'minha-barbearia'

    const newBarbershop: Barbershop = {
      id: newShopId,
      name: shopName.trim(),
      slug: finalSlug,
      owner_name: ownerName.trim(),
      owner_email: email.trim(),
      slogan: slogan.trim(),
      description: 'Atendimento de alta qualidade, conforto e estilo.',
      logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80',
      banner_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
      phone_whatsapp: phone.replace(/\D/g, '') || '5511999998888',
      address: address.trim(),
      theme_color: '#EAB308',
      created_at: new Date().toISOString(),
      monthly_fee: 50.00,
      subscription_status: 'active', // ATIVAÇÃO IMEDIATA SEM APROVAÇÃO MANUAL
      due_day: new Date().getDate(),
      next_billing_date: nextDate.toISOString().split('T')[0],
      pix_key: DEFAULT_PIX_KEY,
      blocked_dates: []
    }

    const createdServices: Service[] = servicesList.map((s, idx) => ({
      id: `serv-new-${idx}`,
      barbershop_id: newShopId,
      name: s.name,
      description: 'Serviço profissional de alta precisão e qualidade.',
      duration_minutes: s.duration,
      price: s.price,
      category: s.name.toLowerCase().includes('barba') && !s.name.toLowerCase().includes('combo')
        ? 'barba'
        : s.name.toLowerCase().includes('combo')
        ? 'combo'
        : 'cabelo',
      active: true
    }))

    // Salvar sessão do barbeiro
    localStorage.setItem('barber_current_user', JSON.stringify({
      email: email.trim(),
      owner_name: ownerName.trim(),
      shop_id: newShopId,
      shop_slug: finalSlug
    }))

    onRegisterBarbershop(newBarbershop, createdServices)
    setStep(3)

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
            Preencha as informações obrigatórias para ativar seu sistema instantaneamente. Zero burocracia.
          </p>
        </div>

        {/* Indicador de Passos */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'w-10 bg-amber-400' : 'w-4 bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'w-10 bg-amber-400' : 'w-4 bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step === 3 ? 'w-10 bg-emerald-400' : 'w-4 bg-slate-800'}`} />
        </div>

        {/* ===================== PASSO 1: DADOS OBRIGATÓRIOS ===================== */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Store className="w-4 h-4" />
              <span>Passo 1: Informações Obrigatórias</span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Nome do Responsável / Barbeiro */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seu Nome Completo (Barbeiro / Responsável) *</span>
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

                {/* Endereço */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Endereço & Bairro *</span>
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
              </div>

              {/* Email e Senha de Acesso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>E-mail de Login *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seuemail@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Senha de Acesso *</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Sua senha secreta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                  />
                </div>
              </div>

              {/* Slogan */}
              <div>
                <label className="block text-slate-400 mb-1">
                  Frase de Destaque / Slogan da Barbearia:
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Continuar para Serviços</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ===================== PASSO 2: SERVIÇOS E PREÇOS ===================== */}
        {step === 2 && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <DollarSign className="w-4 h-4" />
                <span>Passo 2: Defina seus Valores Iniciais</span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ajuste os valores dos serviços mais comuns. Você poderá adicionar mais serviços e alterar preços a qualquer momento no seu painel.
            </p>

            <div className="space-y-3">
              {servicesList.map((serv, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs">{serv.name}</p>
                    <p className="text-slate-400 text-[11px]">{serv.duration} minutos</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="1"
                      value={serv.price}
                      onChange={(e) => handlePriceChange(index, Number(e.target.value))}
                      className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-black text-sm text-right focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90">
              <p className="font-bold text-amber-300">✅ Ativação Instantânea</p>
              <p className="text-[11px] mt-0.5">
                Ao clicar abaixo, sua barbearia é criada imediatamente e seu link já estará disponível para seus clientes agendarem.
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Concluir Cadastro & Acessar Sistema</span>
            </button>
          </div>
        )}

        {/* ===================== PASSO 3: SUCESSO E LINK PRONTO ===================== */}
        {step === 3 && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/40 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Barbearia Ativada com Sucesso!</h2>
              <p className="text-xs text-slate-300 mt-1">
                Parabéns, <strong>{ownerName}</strong>! A <strong>{shopName}</strong> já está cadastrada e o seu link público está no ar.
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
              <p className="text-[10px] text-slate-500">
                Divulgue esse link no seu WhatsApp, Instagram e cartões de visita.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Acessar Meu Painel Administrativo
              </button>

              <button
                onClick={() => navigate(`/${slug}`)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 cursor-pointer"
              >
                Testar Visualização do Cliente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
