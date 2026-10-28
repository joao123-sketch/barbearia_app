import React, { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Check,
  MessageCircle,
  Smartphone,
  TrendingUp,
  Users,
  Scissors,
  Link2,
  UserPlus
} from 'lucide-react'
import { fetchMonthlyFee } from '../lib/db'
import { SUPPORT_WHATSAPP } from '../lib/platform'
import { toWaNumber } from '../lib/phone'

// Tela inicial para quem ainda não entrou: apresenta o SuaAgenda e leva ao cadastro ou ao login.
// Segue o guia da marca: fundo branco, títulos em Playfair Display (palavra de efeito em itálico) e Montserrat no resto.

interface LandingPageProps {
  onSignup: () => void
  onLogin: () => void
}

type Audience = 'barbearia' | 'salao'

const GOLD = '#B07A2A'
const BRONZE = '#A8651F'
const ROSE = '#B0285F'
const GRAPHITE = '#1D1D1D'

const serif = "font-['Playfair_Display',serif]"
const sans = "font-['Montserrat',system-ui,sans-serif]"

const AUDIENCE = {
  barbearia: {
    label: 'Barbearia',
    accent: BRONZE,
    soft: '#FAF5EE',
    line: '#E8D8B8',
    kicker: 'Chega de “tem horário hoje?”',
    lead: 'Agenda online, controle financeiro e a cara da sua barbearia no celular.',
    owner: 'Quem agenda sozinho é o seu cliente.',
    agenda: [
      { time: '09:00', name: 'Lucas A.', service: 'Corte masculino', price: 'R$ 45' },
      { time: '10:00', name: 'Rafael S.', service: 'Corte + Barba', price: 'R$ 75' },
      { time: '11:00', name: 'Pedro H.', service: 'Barba', price: 'R$ 35' }
    ]
  },
  salao: {
    label: 'Salão de beleza',
    accent: ROSE,
    soft: '#FDF3F7',
    line: '#F0CBD9',
    kicker: 'Agenda cheia, cabeça tranquila.',
    lead: 'Suas clientes marcam horário sozinhas, a qualquer hora, e você acompanha agenda e faturamento no celular.',
    owner: 'Quem agenda sozinha é a sua cliente.',
    agenda: [
      { time: '09:00', name: 'Ana C.', service: 'Escova', price: 'R$ 55' },
      { time: '10:00', name: 'Marina L.', service: 'Hidratação', price: 'R$ 90' },
      { time: '11:30', name: 'Bia R.', service: 'Manicure', price: 'R$ 35' }
    ]
  }
} as const

const FEATURES = [
  { icon: CalendarDays, title: 'Agenda do dia', text: 'Quem vem, que horas e quanto vale. WhatsApp do cliente num toque.' },
  { icon: CalendarRange, title: 'Calendário da semana', text: 'Horários livres e marcados de relance, sem choque de horário.' },
  { icon: TrendingUp, title: 'Faturamento', text: 'Previsão da semana, ticket médio e histórico. Sem fazer conta.' },
  { icon: Scissors, title: 'Serviços e combos', text: 'Preço e duração de cada serviço, somados na hora quando o cliente escolhe mais de um.' },
  { icon: Users, title: 'Equipe', text: 'Cada profissional com a sua agenda. Almoço, folgas e férias bloqueados.' },
  { icon: Smartphone, title: 'Vira app no celular', text: 'Instale na tela inicial com a logo do seu negócio e receba aviso a cada novo agendamento.' }
]

const STEPS = [
  { icon: UserPlus, title: 'Crie sua conta', text: 'Escolha barbearia ou salão e informe WhatsApp, e-mail, nome e senha. Leva cerca de 1 minuto.' },
  { icon: Scissors, title: 'Monte sua página', text: 'Cadastre serviços e horários e escolha o estilo da página do seu negócio.' },
  { icon: Link2, title: 'Divulgue o link', text: 'Seu cliente agenda sozinho pelo link, e você acompanha tudo pelo painel no celular.' }
]

const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const Logo: React.FC<{ size?: string }> = ({ size = 'text-2xl' }) => (
  <span className={`${serif} ${size} font-extrabold tracking-tight leading-none`} style={{ color: GRAPHITE }}>
    Sua<em style={{ color: GOLD }}>Agenda</em>
  </span>
)

export const LandingPage: React.FC<LandingPageProps> = ({ onSignup, onLogin }) => {
  const [audience, setAudience] = useState<Audience>('barbearia')
  const [fee, setFee] = useState<number | null>(null)
  const a = AUDIENCE[audience]

  // Fundo claro também na barra do navegador e no overscroll do celular
  useEffect(() => {
    const prevBody = document.body.style.backgroundColor
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const prevMeta = meta?.content
    document.body.style.backgroundColor = '#FFFFFF'
    if (meta) meta.content = '#FFFFFF'
    return () => {
      document.body.style.backgroundColor = prevBody
      if (meta && prevMeta) meta.content = prevMeta
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetchMonthlyFee()
      .then((value) => alive && setFee(value))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const cta = (size: 'md' | 'lg') => (
    <button
      type="button"
      onClick={onSignup}
      className={`${sans} inline-flex items-center justify-center gap-2 rounded-full font-extrabold text-white shadow-lg shadow-amber-900/20 cursor-pointer active:scale-95 hover:brightness-110 transition-all ${
        size === 'lg' ? 'px-8 py-4 text-base' : 'px-4 py-2.5 text-xs sm:text-sm'
      }`}
      style={{ background: `linear-gradient(135deg, ${GOLD}, #94601B)` }}
    >
      <span>Criar conta grátis</span>
      {size === 'lg' && <ArrowRight className="w-5 h-5" />}
    </button>
  )

  const loginButton = (className: string) => (
    <button
      type="button"
      onClick={onLogin}
      className={`${sans} rounded-full border-2 font-bold cursor-pointer active:scale-95 hover:bg-[#FBF6EC] transition-all ${className}`}
      style={{ borderColor: GOLD, color: '#7A5314' }}
    >
      Entrar
    </button>
  )

  return (
    <div className={`${sans} min-h-screen bg-white select-none`} style={{ color: GRAPHITE }}>
      {/* Topo fixo: criar conta e entrar sempre à vista */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b" style={{ borderColor: '#E8D8B8' }}>
        <div className="max-w-5xl mx-auto h-14 px-4 flex items-center justify-between gap-3">
          <Logo size="text-xl sm:text-2xl" />
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-neutral-600">
            <button type="button" onClick={() => scrollTo('funcionalidades')} className="hover:text-black cursor-pointer">
              Funcionalidades
            </button>
            <button type="button" onClick={() => scrollTo('como-comecar')} className="hover:text-black cursor-pointer">
              Como começar
            </button>
            <button type="button" onClick={() => scrollTo('preco')} className="hover:text-black cursor-pointer">
              Preço
            </button>
          </nav>
          <div className="flex items-center gap-2">
            {loginButton('px-4 py-2 text-xs sm:text-sm')}
            {cta('md')}
          </div>
        </div>
      </header>

      {/* Abertura */}
      <section style={{ background: `linear-gradient(180deg, #FBF6EC 0%, #FFFFFF 100%)` }}>
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-12 sm:pt-14 grid md:grid-cols-2 gap-10 items-center">
          <div className="text-center md:text-left space-y-5">
            <div
              className="inline-flex p-1 rounded-full border bg-white text-[11px] sm:text-xs font-bold"
              style={{ borderColor: '#E8D8B8' }}
              role="tablist"
              aria-label="Tipo de negócio"
            >
              {(Object.keys(AUDIENCE) as Audience[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={audience === key}
                  onClick={() => setAudience(key)}
                  className="px-4 py-1.5 rounded-full cursor-pointer transition-colors"
                  style={audience === key ? { background: AUDIENCE[key].accent, color: '#fff' } : { color: '#555' }}
                >
                  {AUDIENCE[key].label}
                </button>
              ))}
            </div>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: a.accent }}>
              {a.kicker}
            </p>
            <h1 className={`${serif} text-4xl sm:text-5xl font-extrabold leading-[1.08] tracking-tight`}>
              Seu cliente agenda <em style={{ color: a.accent }}>sozinho.</em>
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-md mx-auto md:mx-0">{a.lead}</p>

            <div className="flex flex-col items-center md:items-start gap-3 pt-1">
              {cta('lg')}
              <p className="text-xs text-neutral-600">
                Já tem conta?{' '}
                <button type="button" onClick={onLogin} className="font-extrabold underline underline-offset-2 cursor-pointer" style={{ color: '#7A5314' }}>
                  Entrar
                </button>
              </p>
            </div>

            <ul className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1.5 text-[11px] sm:text-xs font-semibold text-neutral-700 pt-1">
              {['20 dias grátis', 'Sem cartão', 'Conta liberada na hora'].map((t) => (
                <li key={t} className="inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" style={{ color: a.accent }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Exemplo ilustrativo do painel */}
          <div className="flex flex-col items-center">
            <div
              className="w-[250px] rounded-[2.2rem] border-[6px] p-3 shadow-2xl shadow-black/15 bg-white"
              style={{ borderColor: GRAPHITE }}
              aria-hidden="true"
            >
              <div className="flex items-center justify-between px-1 pt-1 pb-3">
                <div>
                  <p className={`${serif} text-lg font-extrabold leading-none`}>Hoje</p>
                  <p className="text-[10px] text-neutral-500 mt-1">3 atendimentos</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: a.soft, color: a.accent }}>
                  Agenda
                </span>
              </div>
              <div className="space-y-2">
                {a.agenda.map((row) => (
                  <div key={row.time} className="flex items-center gap-2.5 p-2.5 rounded-2xl border" style={{ borderColor: a.line, background: a.soft }}>
                    <span className="text-[11px] font-extrabold w-10 shrink-0" style={{ color: a.accent }}>
                      {row.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold truncate">{row.name}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{row.service}</p>
                    </div>
                    <span className="text-[11px] font-extrabold shrink-0">{row.price}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl px-3 py-2.5 text-white" style={{ background: GRAPHITE }}>
                <p className="text-[9px] uppercase tracking-widest opacity-70">Previsão do dia</p>
                <p className={`${serif} text-xl font-extrabold`}>
                  R$ {audience === 'barbearia' ? '155' : '180'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 mt-3">Exemplo ilustrativo da agenda do dono</p>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="max-w-5xl mx-auto px-4 py-12 scroll-mt-16">
        <div className="text-center mb-8 space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
            Tudo em um lugar
          </p>
          <h2 className={`${serif} text-3xl sm:text-4xl font-extrabold tracking-tight`}>
            Mais que agenda: <em style={{ color: a.accent }}>tudo para o seu negócio.</em>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="p-4 sm:p-5 rounded-3xl border bg-white flex sm:block items-start gap-3.5" style={{ borderColor: '#E8D8B8' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 sm:mb-3" style={{ background: a.soft, color: a.accent }}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm mb-1">{title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <ul className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
          {[
            'Agendamento de balcão e por telefone',
            '5 estilos para a sua página',
            'Serviços em categorias',
            'Suporte direto no WhatsApp'
          ].map((t) => (
            <li key={t} className="px-3 py-1.5 rounded-full border bg-[#FBF6EC]" style={{ borderColor: '#E8D8B8' }}>
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* Como começar */}
      <section id="como-comecar" className="scroll-mt-16" style={{ background: '#FBF6EC' }}>
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="text-center mb-8 space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
              Passo a passo
            </p>
            <h2 className={`${serif} text-3xl sm:text-4xl font-extrabold tracking-tight`}>
              Comece em <em style={{ color: a.accent }}>3 passos.</em>
            </h2>
          </div>
          <ol className="grid md:grid-cols-3 gap-3.5">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative p-5 rounded-3xl bg-white border" style={{ borderColor: '#E8D8B8' }}>
                <span className={`${serif} absolute top-3 right-5 text-5xl font-extrabold`} style={{ color: '#F0E3C8' }}>
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 text-white" style={{ background: a.accent }}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm mb-1">{title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed relative">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex justify-center">{cta('lg')}</div>
        </div>
      </section>

      {/* Preço e chamada final */}
      <section id="preco" className="scroll-mt-16 px-4 py-12">
        <div className="max-w-3xl mx-auto rounded-[2rem] px-6 py-10 sm:px-10 text-center text-white space-y-4" style={{ background: GRAPHITE }}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: '#E0B35C' }}>
            Simples assim
          </p>
          <h2 className={`${serif} text-3xl sm:text-4xl font-extrabold tracking-tight`}>
            20 dias grátis. <em style={{ color: '#E0B35C' }}>Sem cartão.</em>
          </h2>
          <p className="text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
            Depois do teste, {fee != null ? <strong className="text-white">{formatBRL(fee)} por mês</strong> : 'uma mensalidade única'}.
            Sem fidelidade e sem taxa por agendamento.
          </p>
          <div className="flex flex-col items-center gap-3 pt-2">
            {cta('lg')}
            <button type="button" onClick={onLogin} className="text-xs font-bold text-neutral-300 hover:text-white underline underline-offset-2 cursor-pointer">
              Já tenho conta · Entrar
            </button>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-10 text-center space-y-3">
        <a
          href={`https://wa.me/${toWaNumber(SUPPORT_WHATSAPP)}?text=${encodeURIComponent('Olá! Quero saber mais sobre o SuaAgenda.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full border cursor-pointer hover:bg-[#FBF6EC]"
          style={{ borderColor: '#E8D8B8', color: '#7A5314' }}
        >
          <MessageCircle className="w-4 h-4" />
          Dúvidas? Fale com a gente no WhatsApp
        </a>
        <div>
          <Logo size="text-lg" />
          <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest">Agenda online para barbearias e salões</p>
        </div>
      </footer>
    </div>
  )
}
