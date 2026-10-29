import React from 'react'
import { ArrowRight, BadgeCheck, CreditCard, Percent, Zap } from 'lucide-react'
import { TRIAL_DAYS } from '../lib/billing'
import { STYLE_PRESET_ORDER } from '../lib/stylePresets'

interface SignupStepsProps {
  onSignup: () => void
}

// Os passos refletem o cadastro de verdade (BarberOnboarding): dados do negócio, estilo da página e painel liberado.
const STEPS = [
  {
    title: 'Dados do negócio',
    text: 'Seu nome, o nome do negócio, WhatsApp, e-mail, endereço e uma senha. Você diz se é barbearia ou salão.'
  },
  {
    title: 'Estilo da sua página',
    text: `Escolha entre ${STYLE_PRESET_ORDER.length} estilos prontos. Dá para trocar depois, quando quiser.`
  },
  {
    title: 'Entre no painel na hora',
    text: 'Quem ainda não testou entra na hora e já encontra o link de agendamento para divulgar. Os serviços você cadastra lá.'
  }
]

const TRUST = [
  { icon: Zap, label: 'Teste liberado na hora' },
  { icon: BadgeCheck, label: `${TRIAL_DAYS} dias grátis para testar` },
  { icon: CreditCard, label: 'Sem cartão' },
  { icon: Percent, label: 'Sem taxa por agendamento' }
]

// Cartão "novo por aqui" da tela de entrada: o passo a passo do cadastro e o botão de criar conta
export const SignupSteps: React.FC<SignupStepsProps> = ({ onSignup }) => (
  <section aria-labelledby="novo-aqui" className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 space-y-5 shadow-xl">
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Novo por aqui?</p>
      <h2 id="novo-aqui" className="text-xl font-black text-white tracking-tight leading-tight">
        Crie sua conta em menos de 1 minuto
      </h2>
      <p className="text-xs text-slate-400">Sem esperar aprovação: quem ainda não testou entra no painel na hora, com {TRIAL_DAYS} dias grátis.</p>
    </div>

    <ol className="space-y-3.5">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="shrink-0 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center"
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">
              <span className="sr-only">Passo {index + 1}: </span>
              {step.title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>

    <ul className="grid grid-cols-2 gap-2">
      {TRUST.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70 text-[11px] font-semibold text-slate-200">
          <Icon className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
    <p className="text-[11px] text-slate-400 leading-relaxed">Se este WhatsApp já usou o teste, o acesso só abre depois da primeira mensalidade.</p>

    <button
      type="button"
      onClick={onSignup}
      className="w-full min-h-[48px] py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
    >
      <span>Criar conta grátis</span>
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </button>
  </section>
)
