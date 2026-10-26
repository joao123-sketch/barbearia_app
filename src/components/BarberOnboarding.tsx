import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scissors,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Store,
  DollarSign
} from 'lucide-react'
import confetti from 'canvas-confetti'
import type { Barbershop, Service } from '../types'

interface BarberOnboardingProps {
  onRegisterBarbershop: (shop: Barbershop, services: Service[]) => void
}

export const BarberOnboarding: React.FC<BarberOnboardingProps> = ({
  onRegisterBarbershop
}) => {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Dados do formulário
  const [shopName, setShopName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [slogan, setSlogan] = useState('Tradição e o melhor corte da região.')

  // Serviços padrão sugeridos
  const [servicesList, setServicesList] = useState<Array<{ name: string; price: number; duration: number }>>([
    { name: 'Corte Tradicional / Degradê', price: 40, duration: 35 },
    { name: 'Barba Completa com Toalha Quente', price: 30, duration: 30 },
    { name: 'Combo Cabelo + Barba', price: 65, duration: 60 }
  ])

  // Gerar slug automaticamente ao digitar o nome
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

  // Formatação de telefone
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

  const handleFinish = () => {
    const newShopId = 'shop-' + Date.now()
    const newBarbershop: Barbershop = {
      id: newShopId,
      name: shopName || 'Minha Barbearia',
      slug: slug || 'minha-barbearia',
      slogan: slogan,
      description: 'Atendimento com excelência e conforto.',
      logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80',
      banner_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
      phone_whatsapp: phone.replace(/\D/g, '') || '5511999998888',
      address: address || 'Rua Principal, 100',
      theme_color: '#EAB308'
    }

    const createdServices: Service[] = servicesList.map((s, idx) => ({
      id: `serv-new-${idx}`,
      barbershop_id: newShopId,
      name: s.name,
      description: 'Serviço profissional de alta qualidade.',
      duration_minutes: s.duration,
      price: s.price,
      category: s.name.toLowerCase().includes('barba') && !s.name.toLowerCase().includes('combo') ? 'barba' : s.name.toLowerCase().includes('combo') ? 'combo' : 'cabelo',
      active: true
    }))

    onRegisterBarbershop(newBarbershop, createdServices)
    setStep(3)

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch {
      // ignore
    }
  }

  const clientUrl = `${window.location.origin}/${slug || 'sua-barbearia'}`

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col justify-center px-4 py-8 select-none">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Header com Logo e Título */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <Scissors className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Criar Minha Barbearia
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Cadastre seu negócio em menos de 1 minuto e comece a receber agendamentos hoje mesmo.
          </p>
        </div>

        {/* Indicador de Passos */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'w-8 bg-amber-400' : 'w-4 bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'w-8 bg-amber-400' : 'w-4 bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step === 3 ? 'w-8 bg-amber-400' : 'w-4 bg-slate-800'}`} />
        </div>

        {/* ===================== PASSO 1: DADOS BÁSICOS ===================== */}
        {step === 1 && (
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Store className="w-4 h-4" />
              <span>Passo 1: Dados do seu Estabelecimento</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome da Barbearia *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Barbearia Dom João"
                  value={shopName}
                  onChange={handleNameChange}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Seu Link Personalizado
                </label>
                <div className="flex items-center px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-500 shrink-0 font-mono">app.com/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-transparent text-amber-300 font-mono font-bold focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Este é o link que você vai divulgar no seu Instagram.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  WhatsApp para Notificações *
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Endereço e Bairro *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Brasil, 450 - Centro"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Frase de Destaque / Slogan
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!shopName.trim() || phone.length < 14) {
                  alert('Por favor, informe o nome da barbearia e um WhatsApp válido.')
                  return
                }
                setStep(2)
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Avançar para Serviços</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================== PASSO 2: SERVIÇOS INICIAIS ===================== */}
        {step === 2 && (
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <DollarSign className="w-4 h-4" />
                <span>Passo 2: Defina seus Preços</span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Coloque os valores que você já cobra atualmente. Você poderá adicionar mais serviços depois no painel.
            </p>

            <div className="space-y-3">
              {servicesList.map((serv, index) => (
                <div
                  key={index}
                  className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs">{serv.name}</p>
                    <p className="text-slate-400 text-[11px]">{serv.duration} minutos</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      value={serv.price}
                      onChange={(e) => handlePriceChange(index, Number(e.target.value))}
                      className="w-16 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold text-sm text-right focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Criar Minha Barbearia Grátis</span>
            </button>
          </div>
        )}

        {/* ===================== PASSO 3: SUCESSO ===================== */}
        {step === 3 && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Barbearia Criada!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Seu link já está ativo e pronto para receber clientes.
              </p>
            </div>

            {/* Card com o link */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 text-left text-xs space-y-1">
              <span className="text-slate-400 text-[11px] block">Seu link oficial:</span>
              <span className="text-amber-400 font-mono font-bold block truncate">
                {clientUrl}
              </span>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Ir para o Painel do Barbeiro
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
