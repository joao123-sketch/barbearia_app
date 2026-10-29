import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { fetchMonthlyFee } from '../lib/db'
import { instagramUrl, mailtoUrl, whatsappUrl } from '../lib/contacts'
import { ContactLinks } from './ContactLinks'
import { STYLE_PRESET_ORDER } from '../lib/stylePresets'
import '../landing.css'

// Página inicial de quem ainda não entrou. Um painel de blocos com as telas reais do app (contas de demonstração,
// nomes fictícios). O alternador Barbearia / Salão troca as cores e as telas da página inteira.

interface LandingPageProps {
  onSignup: () => void
  onLogin: () => void
}

type Audience = 'barbearia' | 'salao'

const AUDIENCE: Record<Audience, { label: string; prefix: 'b' | 's'; lead: string; booking: string }> = {
  barbearia: {
    label: 'Barbearia',
    prefix: 'b',
    lead: 'Chega de “tem horário hoje?”. Agenda online, financeiro e a cara da sua barbearia no celular.',
    booking: 'Página de agendamento de uma barbearia, com a lista de serviços e preços'
  },
  salao: {
    label: 'Salão de beleza',
    prefix: 's',
    lead: 'Suas clientes marcam horário sozinhas, a qualquer hora, e você acompanha agenda e faturamento no celular.',
    booking: 'Página de agendamento de um salão, com a lista de serviços e preços'
  }
}

type Shot = 'booking' | 'agenda' | 'semana' | 'painel' | 'historico' | 'horarios'
const SIZE: Record<Shot, [number, number]> = {
  booking: [560, 1212],
  agenda: [560, 1158],
  semana: [560, 1158],
  painel: [560, 1158],
  historico: [560, 1158],
  horarios: [560, 1158]
}

const formatBRL = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const scrollTo = (id: string) => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

// Aparece uma vez quando entra na tela
function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const items = el.querySelectorAll<HTMLElement>('.lp-reveal')
    if (!('IntersectionObserver' in window)) {
      items.forEach((i) => i.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
    )
    items.forEach((i) => io.observe(i))
    return () => io.disconnect()
  }, [root])
}

const Mark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`lp-mark ${className}`}>
    Sua<em>Agenda</em>
  </span>
)

const reveal = (ms = 0): React.CSSProperties => ({ ['--d' as string]: `${ms}ms` })
const CLAIM = 'Seu cliente agenda sozinho'

export const LandingPage: React.FC<LandingPageProps> = ({ onSignup, onLogin }) => {
  const [audience, setAudience] = useState<Audience>('barbearia')
  const [fee, setFee] = useState<number | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const a = AUDIENCE[audience]
  useReveal(root)

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

  // Tela do app da barbearia ou do salão, conforme o alternador
  const shot = (name: Shot, alt: string, eager = false) => {
    const [w, h] = SIZE[name]
    return (
      <img
        key={`${audience}-${name}`}
        src={`/landing/${a.prefix}-${name}.webp`}
        alt={alt}
        width={w}
        height={h}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    )
  }

  return (
    <div ref={root} className="lp" data-aud={audience}>
      <div className="lp-top" role="group" aria-label="Contatos do SuaAgenda">
        <ContactLinks variant="topbar" />
      </div>
      <header className="lp-bar">
        <div className="lp-bar-in">
          <Mark />
          <nav className="lp-nav" aria-label="Seções da página">
            <button type="button" onClick={() => scrollTo('funcionalidades')}>
              Funcionalidades
            </button>
            <button type="button" onClick={() => scrollTo('como-comecar')}>
              Como começar
            </button>
            <button type="button" onClick={() => scrollTo('preco')}>
              Preço
            </button>
          </nav>
          <div className="lp-bar-act">
            <button type="button" className="lp-btn lp-btn--soft" onClick={onLogin}>
              Entrar
            </button>
            <button type="button" className="lp-btn lp-btn--acc" onClick={onSignup}>
              <span>
                Criar conta<span className="lp-hide-s"> grátis</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <div className="lp-pad lp-first">
          {/* ===== abertura ===== */}
          <div className="lp-board">
            <section className="t t-stone hero-h1 span-all" aria-labelledby="titulo">
              <div className="lp-aud" role="group" aria-label="Tipo de negócio">
                {(Object.keys(AUDIENCE) as Audience[]).map((key) => (
                  <button key={key} type="button" aria-pressed={audience === key} onClick={() => setAudience(key)}>
                    {AUDIENCE[key].label}
                  </button>
                ))}
              </div>
              <h1 id="titulo" className="lp-display">
                Seu cliente agenda <em>sozinho.</em>
              </h1>
              <p className="lp-lead">{a.lead}</p>
            </section>

            <div className="t t-img hero-img drift span-all lp-reveal" style={reveal(80)}>
              {shot('booking', a.booking, true)}
            </div>

            <div className="t t-acc hero-act span-all lp-reveal" style={reveal(120)}>
              <button type="button" className="act-main" onClick={onSignup}>
                <span>Criar conta grátis</span>
                <ArrowRight size={32} aria-hidden="true" />
              </button>
              <p className="lp-small lp-soft">20 dias de teste, sem cartão. A conta é liberada na hora.</p>
              <button type="button" className="act-link" onClick={onLogin}>
                Já tenho conta · Entrar
              </button>
            </div>

            <div className="t t-img hero-agenda pair-sq lp-reveal" style={reveal(160)}>
              {shot('agenda', 'Agenda do dia com os horários, os clientes e os valores')}
            </div>
            <div className="t t-ink hero-fig fig-tile lp-reveal" style={reveal(200)}>
              <span className="lp-fig">1 min</span>
              <p className="lp-small lp-soft">para criar a conta e receber o link de agendamento.</p>
            </div>
            <div className="t t-img hero-painel wide-img span-all lp-reveal" style={reveal(240)}>
              {shot('painel', 'Painel com o faturamento previsto do dia e o link de agendamento')}
            </div>
          </div>

          {/* ===== recursos ===== */}
          <section id="funcionalidades" className="lp-sec" aria-labelledby="t-recursos">
            <div className="lp-board f-grid">
              <div className="f-head span-all lp-reveal">
                <h2 id="t-recursos" className="lp-head">
                  Agenda, financeiro e link num só lugar.
                </h2>
              </div>
              <div className="t t-img f-shot1 pair-sq lp-reveal" style={reveal(60)}>
                {shot('semana', 'Calendário da semana com horários livres e marcados')}
              </div>
              <div className="t t-img f-shot2 pair-sq lp-reveal" style={reveal(120)}>
                {shot('historico', 'Histórico de atendimentos com total faturado')}
              </div>
              <div className="t t-ink f-sent1 span-all lp-reveal" style={reveal(40)}>
                <p className="sentence sentence--big">Quem vem, que horas e quanto vale. O WhatsApp do cliente a um toque.</p>
              </div>
              <div className="t t-acc f-fig fig-tile span-all lp-reveal">
                <span className="lp-fig">R$ 0</span>
                <p className="lp-small lp-soft">de taxa por agendamento. Você paga só a mensalidade.</p>
              </div>
              <div className="t t-stone f-list span-all lp-reveal" style={reveal(60)}>
                <ul className="list-tile">
                  <li>Agenda do dia</li>
                  <li>Calendário da semana</li>
                  <li>Faturamento e ticket médio</li>
                  <li>Serviços e combos</li>
                </ul>
              </div>
              <div className="t t-tint f-sent2 span-all lp-reveal" style={reveal(120)}>
                <p className="sentence">Cada profissional com a sua agenda. Almoço, folgas e férias bloqueados.</p>
              </div>
              <div className="t t-stone f-sent3 span-all lp-reveal" style={reveal(180)}>
                <p className="sentence">Instale na tela inicial com a logo do seu negócio e receba aviso a cada agendamento.</p>
              </div>
            </div>
          </section>
        </div>

        {/* ===== faixa que corre ===== */}
        <div className="lp-marquee" aria-hidden="true">
          <div className="lp-marquee-track">
            {[0, 1].map((n) => (
              <span key={n}>
                {CLAIM} <i>·</i> Agenda cheia, cabeça tranquila <i>·</i> {CLAIM} <i>·</i> Chega de “tem horário hoje?” <i>·</i>
              </span>
            ))}
          </div>
        </div>

        <div className="lp-pad">
          {/* ===== a página do cliente ===== */}
          <section className="lp-sec" aria-labelledby="t-pagina">
            <div className="lp-board">
              <div className="t t-ink s-state span-all lp-reveal">
                <h2 id="t-pagina" className="lp-head">
                  A sua página, com a sua cara.
                </h2>
                <p className="lp-lead lp-soft" style={{ marginTop: 20 }}>
                  Escolha um estilo, toque e veja a página inteira mudar na hora. Troque quando quiser.
                </p>
              </div>
              <div className="t t-img s-b pair-sq lp-reveal" style={reveal(60)}>
                <img src="/landing/b-booking.webp" alt="Página de agendamento de uma barbearia, em tons escuros e dourados" width={560} height={1212} loading="lazy" decoding="async" />
              </div>
              <div className="t t-img s-s pair-sq lp-reveal" style={reveal(120)}>
                <img src="/landing/s-booking.webp" alt="Página de agendamento de um salão, em tons de rosa" width={560} height={1212} loading="lazy" decoding="async" />
              </div>
              <div className="t t-img s-reg wide-img span-all lp-reveal" style={reveal(80)}>
                <img src="/landing/cadastro.webp" alt="Escolha do estilo visual no cadastro" width={560} height={1049} loading="lazy" decoding="async" />
              </div>
              <div className="t t-accd s-fig fig-tile span-all lp-reveal" style={reveal(140)}>
                <span className="lp-fig">{STYLE_PRESET_ORDER.length} estilos</span>
                <p className="lp-small lp-soft">prontos para a sua página, da barbearia clássica ao salão delicado.</p>
              </div>
            </div>
          </section>
        </div>

        {/* ===== passos ===== */}
        <section id="como-comecar" className="lp-sec" aria-labelledby="t-passos">
          <div className="lp-pad">
            <div className="steps-head lp-reveal">
              <h2 id="t-passos" className="lp-head">
                Comece em minutos.
              </h2>
            </div>
          </div>
          <ol className="steps">
            <li className="step lp-reveal">
              <div className="shot">
                <img src="/landing/cadastro.webp" alt="Tela de cadastro do negócio" width={560} height={1049} loading="lazy" decoding="async" />
              </div>
              <p>Primeiro, crie a conta.</p>
            </li>
            <li className="step lp-reveal" style={reveal(90)}>
              <div className="shot">{shot('horarios', 'Tela de horários e pausas do painel')}</div>
              <p>Depois, cadastre serviços e horários.</p>
            </li>
            <li className="step lp-reveal" style={reveal(180)}>
              <div className="shot">{shot('painel', 'Painel com o link de agendamento pronto para copiar')}</div>
              <p>Divulgue o seu link.</p>
            </li>
            <li className="step lp-reveal" style={reveal(270)}>
              <div className="shot">{shot('agenda', 'Agenda do dia com os agendamentos recebidos')}</div>
              <p>E receba os agendamentos no celular.</p>
            </li>
          </ol>
        </section>

        <div className="lp-pad">
          {/* ===== preço ===== */}
          <section id="preco" className="lp-sec" aria-labelledby="t-preco">
            <div className="price-wrap">
              <div className="price-text lp-reveal">
                <h2 id="t-preco" className="lp-head price-h">
                  Quanto custa
                </h2>
                <p className="lp-soft" style={{ marginTop: 14, maxWidth: '30ch' }}>
                  Teste 20 dias sem cartão. Depois, uma mensalidade única, sem fidelidade.
                </p>
              </div>
              <div className="price-main lp-reveal" style={reveal(80)}>
                {fee != null ? (
                  <div className="price-fig" aria-label={`R$ ${formatBRL(fee)} por mês`}>
                    <span className="cur">R$</span>
                    {formatBRL(fee)}
                    <span className="per">por mês</span>
                    <div className="price-shot" aria-hidden="true">
                      <img src={`/landing/${a.prefix}-painel.webp`} alt="" width={560} height={1158} loading="lazy" decoding="async" />
                    </div>
                  </div>
                ) : (
                  <p className="lp-head">Veja o valor ao criar a conta.</p>
                )}
                <ul className="price-inc" style={{ marginTop: 28 }}>
                  <li>20 dias grátis para testar</li>
                  <li>Sem cartão e sem fidelidade</li>
                  <li>Sem taxa por agendamento</li>
                  <li>
                    <a className="price-link" href={whatsappUrl('Olá! Quero saber mais sobre o SuaAgenda.')} target="_blank" rel="noopener noreferrer">
                      Suporte direto no WhatsApp
                    </a>
                  </li>
                </ul>
                <button type="button" className="lp-btn lp-btn--acc lp-btn--lg" style={{ marginTop: 24 }} onClick={onSignup}>
                  Criar conta grátis
                  <ArrowRight size={22} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          {/* ===== fechamento ===== */}
          <section className="lp-sec" aria-labelledby="t-fim">
            <div className="cta-row">
              <div className="t t-acc cta-main lp-reveal">
                <div className="cta-text">
                  <h2 id="t-fim" className="lp-head">
                    Crie sua conta agora.
                  </h2>
                  <p className="lp-lead lp-soft" style={{ maxWidth: '30ch' }}>
                    Leva cerca de 1 minuto, e você já entra no painel.
                  </p>
                  <div className="cta-btns">
                    <button type="button" className="lp-btn lp-btn--paper lp-btn--lg" onClick={onSignup}>
                      Criar conta grátis
                      <ArrowRight size={22} aria-hidden="true" />
                    </button>
                    <button type="button" className="act-link" onClick={onLogin}>
                      Já tenho conta · Entrar
                    </button>
                  </div>
                  <p className="cta-contacts">
                    Prefere conversar?{' '}
                    <a href={whatsappUrl('Olá! Quero saber mais sobre o SuaAgenda.')} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                    <a href={mailtoUrl('Dúvida sobre o SuaAgenda')}>E-mail</a>
                    <a href={instagramUrl()} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  </p>
                </div>
                <div className="cta-shot" aria-hidden="true">
                  <img src={`/landing/${a.prefix}-semana.webp`} alt="" width={560} height={1158} loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="t t-img cta-side cta-left lp-reveal" style={reveal(80)}>
                <img src={`/landing/${a.prefix}-historico.webp`} alt="" width={560} height={1158} loading="lazy" decoding="async" />
              </div>
              <div className="t t-ink cta-side cta-right lp-reveal" style={reveal(140)} aria-hidden="true" />
            </div>
          </section>
        </div>
      </main>

      {/* ===== rodapé ===== */}
      <footer className="lp-foot">
        <Mark className="foot-mark" />
        <div className="foot-grid">
          <div className="foot-col">
            <h3>Conta</h3>
            <button type="button" onClick={onSignup}>
              Criar conta grátis
            </button>
            <button type="button" onClick={onLogin}>
              Entrar
            </button>
          </div>
          <div className="foot-col">
            <h3>Nesta página</h3>
            <button type="button" onClick={() => scrollTo('funcionalidades')}>
              Funcionalidades
            </button>
            <button type="button" onClick={() => scrollTo('como-comecar')}>
              Como começar
            </button>
            <button type="button" onClick={() => scrollTo('preco')}>
              Preço
            </button>
          </div>
          <div className="foot-contact">
            <h3>Fale com a gente</h3>
            <ContactLinks variant="landing" />
          </div>
        </div>
        <div className="foot-end">
          <span>SuaAgenda · agenda online para barbearias e salões.</span>
          <span>Telas de demonstração do app, com nomes fictícios.</span>
        </div>
      </footer>
    </div>
  )
}
