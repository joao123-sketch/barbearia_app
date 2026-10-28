import React, { useEffect, useState } from 'react'
import { AlertTriangle, BellRing, ChevronRight, Lock, LogOut, Phone, X } from 'lucide-react'
import type { Barbershop } from '../types'
import { formatBR, formatMoney, getBillingState } from '../lib/billing'
import { toWaNumber } from '../lib/phone'
import { DEFAULT_PLATFORM_SETTINGS, SUPPORT_WHATSAPP, type PlatformSettings } from '../lib/platform'
import { BillingPanel } from './BillingPanel'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// Mensalidade que o dono deve pagar (reajuste agendado vale no próximo pagamento)
export const amountDueOf = (shop: Barbershop, platform: PlatformSettings) =>
  shop.next_monthly_fee || shop.monthly_fee || platform.monthly_fee

interface NoticeProps {
  barbershop: Barbershop
  platform: PlatformSettings
  onPay: () => void
}

// Faixa de cobrança no topo do painel: fica enquanto a mensalidade estiver perto de vencer ou vencida
export const BillingBanner: React.FC<NoticeProps> = ({ barbershop, platform, onPay }) => {
  const billing = getBillingState(barbershop, platform.grace_days)
  const amount = amountDueOf(barbershop, platform)

  if (billing.status === 'expired') {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/25 via-slate-900 to-slate-900 border border-rose-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-black text-sm text-rose-300">
              Mensalidade vencida há {plural(billing.overdueDays, 'dia', 'dias')}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Valor pendente: <strong className="text-white">R$ {formatMoney(amount)}</strong> (venceu em {formatBR(billing.dueDate)}).{' '}
              {billing.graceDaysLeft === 0
                ? 'O acesso será bloqueado amanhã.'
                : `O acesso será bloqueado em ${plural(billing.graceDaysLeft, 'dia', 'dias')}.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onPay}
          className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-lg shadow-rose-500/20"
        >
          <span>Pagar agora</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if ((billing.status === 'trial' || billing.status === 'active') && billing.daysLeft <= 5) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-amber-300">
              {billing.status === 'trial' ? 'Seu teste grátis' : 'Seu período pago'}{' '}
              {billing.daysLeft === 0
                ? 'termina hoje!'
                : billing.daysLeft === 1
                ? 'termina amanhã!'
                : `termina em ${billing.daysLeft} dias.`}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Para continuar sem interrupção, pague <strong>R$ {formatMoney(amount)}</strong> pelo Pix e ganhe mais 30 dias.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onPay}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-lg shadow-amber-500/20"
        >
          <span>Pagar com Pix</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return null
}

// Aviso em destaque quando o dono entra com a mensalidade vencida (uma vez por visita ao app).
// Fica fora do caminho: "Agora não" fecha, mas a faixa de cobrança continua no painel.
export const BillingEntryNotice: React.FC<NoticeProps> = ({ barbershop, platform, onPay }) => {
  const billing = getBillingState(barbershop, platform.grace_days)
  const key = `billing_notice_${barbershop.id}_${billing.dueDate}`
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (billing.status !== 'expired') return
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // navegação privada: mostra mesmo assim, uma vez por abertura do painel
    }
    setOpen(true)
  }, [billing.status, key])

  if (!open || billing.status !== 'expired') return null
  const amount = amountDueOf(barbershop, platform)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overscroll-contain">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/50 shadow-2xl p-5 space-y-4 text-center relative">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-black text-lg text-white">Mensalidade vencida</h3>
          <p className="text-3xl font-black text-amber-400">R$ {formatMoney(amount)}</p>
          <p className="text-sm text-rose-300 font-bold">{plural(billing.overdueDays, 'dia', 'dias')} de atraso</p>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {billing.graceDaysLeft === 0
            ? 'Seu acesso será bloqueado amanhã.'
            : `Regularize em até ${plural(billing.graceDaysLeft, 'dia', 'dias')} para não perder o acesso ao painel e ao link de agendamento.`}
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onPay()
          }}
          className="w-full py-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-sm cursor-pointer active:scale-95 transition"
        >
          Pagar agora com Pix
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-white cursor-pointer">
          Agora não
        </button>
      </div>
    </div>
  )
}

// Janela de pagamento aberta a partir da faixa ou do aviso
export const BillingPayModal: React.FC<{
  barbershop: Barbershop
  platform: PlatformSettings
  onClose: () => void
  onPaid: () => void | Promise<void>
}> = ({ barbershop, platform, onClose, onPaid }) => (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto overscroll-contain">
    <div className="min-h-full flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 relative">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base text-white">Mensalidade</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <BillingPanel barbershop={barbershop} platform={platform} onPaid={onPaid} autoStart showHistory={false} />
      </div>
    </div>
  </div>
)

// Acesso bloqueado: só a cobrança fica disponível, até o pagamento ser confirmado
export const BillingLockedScreen: React.FC<{
  barbershop: Barbershop
  platform: PlatformSettings
  onPaid: () => void | Promise<void>
  onLogout?: () => void
}> = ({ barbershop, platform = DEFAULT_PLATFORM_SETTINGS, onPaid, onLogout }) => {
  const billing = getBillingState(barbershop, platform.grace_days)
  const manual = billing.blockReason === 'manual'
  const title =
    billing.blockReason === 'first_payment'
      ? 'Falta o primeiro pagamento'
      : manual
      ? 'Acesso suspenso'
      : 'Acesso bloqueado por falta de pagamento'
  const message =
    billing.blockReason === 'first_payment'
      ? 'Este WhatsApp já usou o teste grátis em outra conta. Pague a primeira mensalidade para liberar o painel e o link.'
      : manual
      ? 'Sua conta foi suspensa pela administração. Fale com o suporte para regularizar.'
      : `Sua mensalidade está vencida há ${plural(billing.overdueDays, 'dia', 'dias')}. Pague agora e o acesso volta na hora, com todos os seus dados e agendamentos.`

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 select-none">
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center space-y-1">
          <p className="text-xs text-slate-500 font-semibold">{barbershop.name}</p>
        </div>

        <div className="rounded-3xl bg-slate-900 border border-rose-500/40 shadow-xl overflow-hidden">
          <div className="p-4 flex items-start gap-3 bg-rose-500/10">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-base text-white">{title}</h1>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{message}</p>
            </div>
          </div>
          {!manual && (
            <div className="p-4">
              <BillingPanel barbershop={barbershop} platform={platform} onPaid={onPaid} autoStart />
            </div>
          )}
        </div>

        <a
          href={`https://wa.me/${toWaNumber(SUPPORT_WHATSAPP)}?text=${encodeURIComponent(`Olá! Preciso de ajuda com a mensalidade de ${barbershop.name}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>Falar com o suporte no WhatsApp</span>
        </a>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da conta</span>
          </button>
        )}
      </div>
    </div>
  )
}
