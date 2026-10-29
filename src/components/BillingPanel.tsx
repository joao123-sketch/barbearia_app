import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, Phone, QrCode, Receipt, ShieldCheck } from 'lucide-react'
import type { Barbershop } from '../types'
import { formatBR, formatMoney, getBillingState } from '../lib/billing'
import { fetchMyInvoices, requestPixCheckout, type Invoice, type PixCheckout } from '../lib/db'
import { whatsappUrl } from '../lib/contacts'
import { toWaNumber } from '../lib/phone'
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '../lib/platform'
import { PixPayment } from './PixPayment'

interface BillingPanelProps {
  barbershop: Barbershop
  platform?: PlatformSettings
  // Chamado quando o pagamento é confirmado pelo servidor (o painel recarrega os dados e o acesso volta)
  onPaid: () => void | Promise<void>
  // Já abre o Pix (telas de cobrança); senão espera o toque em "Pagar com Pix"
  autoStart?: boolean
  showHistory?: boolean
}

const POLL_MS = 4000

const statusLabel: Record<Invoice['status'], string> = { open: 'Em aberto', paid: 'Paga', cancelled: 'Cancelada' }

// Área da mensalidade: valor, vencimento, situação, pagamento por Pix e histórico.
// A confirmação vem do servidor (webhook do provedor); a tela só consulta o resultado.
export const BillingPanel: React.FC<BillingPanelProps> = ({
  barbershop,
  platform = DEFAULT_PLATFORM_SETTINGS,
  onPaid,
  autoStart = false,
  showHistory = true
}) => {
  const billing = getBillingState(barbershop, platform.grace_days)
  const amount = barbershop.next_monthly_fee || barbershop.monthly_fee || platform.monthly_fee

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [checkout, setCheckout] = useState<PixCheckout | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsCpf, setNeedsCpf] = useState(false)
  const [cpf, setCpf] = useState('')
  const [copied, setCopied] = useState(false)
  const [paid, setPaid] = useState(false)
  const [manual, setManual] = useState(false) // Pix manual (chave do dono da plataforma) quando o pagamento automático não está disponível
  const paidHandled = useRef(false)

  const loadInvoices = useCallback(async () => {
    try {
      setInvoices(await fetchMyInvoices(barbershop.id))
    } catch {
      // sem rede: tenta no próximo ciclo
    }
  }, [barbershop.id])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const startCheckout = useCallback(
    async (cpfCnpj?: string) => {
      setLoading(true)
      setError('')
      try {
        const result = await requestPixCheckout(cpfCnpj)
        if (result.error === 'cpf_required') {
          setNeedsCpf(true)
          return
        }
        if (result.error === 'suspended') {
          setError('Sua conta foi suspensa pela administração. Fale com o suporte para regularizar.')
          return
        }
        if (result.error) {
          setError('O pagamento automático está indisponível no momento. Já avisamos o suporte. Você pode usar o Pix manual abaixo.')
          return
        }
        setNeedsCpf(false)
        setCheckout(result)
      } catch {
        // Servidor de pagamento fora do ar ou ainda não configurado: o Pix manual continua disponível
        setError('Não foi possível gerar o Pix automático agora. Tente de novo ou use o Pix manual.')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStart && !autoStarted.current) {
      autoStarted.current = true
      startCheckout()
    }
  }, [autoStart, startCheckout])

  // Enquanto o Pix está na tela, consulta a fatura até o servidor confirmar o pagamento
  const invoiceId = checkout?.invoice?.id
  useEffect(() => {
    if (!invoiceId || paid) return
    const check = async () => {
      if (document.hidden) return
      try {
        const list = await fetchMyInvoices(barbershop.id)
        setInvoices(list)
        if (list.find((i) => i.id === invoiceId)?.status === 'paid' && !paidHandled.current) {
          paidHandled.current = true
          setPaid(true)
          await onPaid()
        }
      } catch {
        // tenta no próximo ciclo
      }
    }
    const timer = window.setInterval(check, POLL_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [invoiceId, barbershop.id, paid, onPaid])

  const copyPix = async () => {
    if (!checkout?.pix) return
    try {
      await navigator.clipboard.writeText(checkout.pix.payload)
    } catch {
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  const situation = (() => {
    if (billing.status === 'blocked') {
      return billing.blockReason === 'first_payment'
        ? { text: 'Falta o primeiro pagamento', tone: 'text-rose-400' }
        : { text: 'Acesso bloqueado', tone: 'text-rose-400' }
    }
    if (billing.status === 'expired') {
      return {
        text: `Vencida há ${billing.overdueDays} ${billing.overdueDays === 1 ? 'dia' : 'dias'}`,
        tone: 'text-rose-400'
      }
    }
    if (billing.status === 'trial') return { text: 'Teste grátis', tone: 'text-emerald-400' }
    return { text: 'Em dia', tone: 'text-emerald-400' }
  })()

  const dueLabel = billing.status === 'trial' ? 'Teste grátis até' : billing.status === 'active' ? 'Paga até' : 'Venceu em'
  const whatsapp = platform.contact_whatsapp
  const manualFallback = manual || (checkout && !checkout.configured)

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
          <span className="text-slate-400 text-[10px]">Valor</span>
          <p className="font-black text-amber-400 text-sm sm:text-lg leading-tight mt-1 whitespace-nowrap">R$ {formatMoney(amount)}</p>
          <span className="text-[10px] text-slate-500">libera 30 dias</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
          <span className="text-slate-400 text-[10px]">{dueLabel}</span>
          <p className="font-bold text-white text-sm sm:text-lg leading-tight mt-1 whitespace-nowrap">{formatBR(billing.dueDate)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
          <span className="text-slate-400 text-[10px]">Situação</span>
          <p className={`font-extrabold text-sm leading-tight mt-1 ${situation.tone}`}>{situation.text}</p>
          {billing.status === 'expired' && (
            <span className="text-[10px] text-amber-400 font-semibold">
              {billing.graceDaysLeft === 0 ? 'bloqueia amanhã' : `bloqueia em ${billing.graceDaysLeft}d`}
            </span>
          )}
        </div>
      </div>

      {paid ? (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center space-y-1.5">
          <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
          <p className="font-black text-base text-emerald-300">Pagamento confirmado!</p>
          <p className="text-slate-300">Seu acesso está liberado por mais 30 dias.</p>
        </div>
      ) : checkout?.pix ? (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-center">
          <p className="text-slate-300">
            Pague <strong className="text-white">R$ {formatMoney(checkout.invoice?.amount ?? amount)}</strong> pelo Pix. A confirmação é automática.
          </p>
          <div className="bg-white rounded-2xl p-3 w-fit mx-auto">
            <img src={`data:image/png;base64,${checkout.pix.image}`} alt="QR Code Pix" width={176} height={176} className="w-44 h-44" />
          </div>
          <button
            type="button"
            onClick={copyPix}
            className="w-full max-w-sm mx-auto py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado! Cole no app do banco' : 'Copiar Pix copia e cola'}</span>
          </button>
          <p className="flex items-center justify-center gap-1.5 text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Aguardando o pagamento… assim que cair, o acesso é liberado sozinho.
          </p>
        </div>
      ) : manualFallback ? (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-center">
          <PixPayment platform={platform} amount={amount} />
          {/* Número configurável no /master (recebe os comprovantes do Pix manual): não é o contato de suporte de contacts.ts */}
          {whatsapp && (
            <a
              href={`https://wa.me/${toWaNumber(whatsapp)}?text=${encodeURIComponent(`Olá! Realizei o pagamento de R$ ${formatMoney(amount)} de ${barbershop.name}. Segue o comprovante:`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full max-w-sm mx-auto py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Enviar comprovante pelo WhatsApp</span>
            </a>
          )}
        </div>
      ) : needsCpf ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            startCheckout(cpf)
          }}
          className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
        >
          <p className="text-slate-300">Para gerar o Pix, informe o CPF ou CNPJ de quem vai pagar. Ele é enviado só ao banco, e não fica salvo no SuaAgenda.</p>
          <input name="cpf" autoComplete="off" aria-label="CPF ou CNPJ"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(e.target.value.replace(/[^\d./-]/g, ''))}
            placeholder="CPF ou CNPJ"
            className="w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
          />
          <button
            type="submit"
            disabled={loading || cpf.replace(/\D/g, '').length < 11}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Gerando…' : 'Gerar Pix'}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => startCheckout()}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          <span>{loading ? 'Gerando o Pix…' : `Pagar R$ ${formatMoney(amount)} com Pix`}</span>
        </button>
      )}

      {error && !paid && (
        <div role="alert" className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-2">
          <p className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
          <div className="flex flex-wrap gap-x-4">
            {!manual && (
              <button type="button" onClick={() => setManual(true)} className="underline font-semibold cursor-pointer min-h-[44px]">
                Usar o Pix manual (confirmação pelo WhatsApp)
              </button>
            )}
            <a
              href={whatsappUrl(`Olá! Preciso de ajuda com a mensalidade de ${barbershop.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold inline-flex items-center min-h-[44px]"
            >
              Falar com o suporte no WhatsApp
            </a>
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        Pagamento seguro. Você não precisa cadastrar cartão, e a confirmação não depende de enviar comprovante.
      </p>

      {showHistory && invoices.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            Mensalidades
          </h4>
          <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
            {invoices.map((inv) => (
              <li key={inv.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200">R$ {formatMoney(inv.paid_amount ?? inv.amount)}</p>
                  <p className="text-[10px] text-slate-500">
                    {inv.status === 'paid' && inv.paid_at
                      ? `Paga em ${formatBR(inv.paid_at.slice(0, 10))}`
                      : `Vencimento ${formatBR(inv.due_date)}`}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    inv.status === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : inv.status === 'open'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-slate-700/60 text-slate-400'
                  }`}
                >
                  {statusLabel[inv.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
