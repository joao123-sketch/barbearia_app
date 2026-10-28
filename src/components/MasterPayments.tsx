import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Receipt } from 'lucide-react'
import { formatBR, formatMoney } from '../lib/billing'
import {
  adminFetchInvoices,
  adminFetchPaymentEvents,
  adminResolveInvoice,
  friendlyError,
  type Invoice,
  type InvoiceFlag,
  type PaymentEvent
} from '../lib/db'

const FLAG_TEXT: Record<InvoiceFlag, string> = {
  duplicate_payment: 'Pagamento em duplicidade: confira e devolva o valor pelo Asaas, se for o caso',
  amount_mismatch: 'Valor recebido menor que a fatura: o acesso NÃO foi liberado',
  orphan_payment: 'Pagamento de uma fatura cancelada: confira e libere manualmente, se for o caso',
  refunded: 'Estorno ou contestação avisado pelo Asaas: confira se o acesso deve continuar'
}

const RESULT_TEXT: Record<string, string> = {
  applied: 'Pagamento aplicado',
  already_paid: 'Reenvio ignorado (já pago)',
  duplicate: 'Duplicado: precisa de conferência',
  amount_mismatch: 'Valor menor: precisa de conferência',
  cancelled_invoice: 'Fatura cancelada: precisa de conferência',
  unmatched: 'Cobrança desconhecida (não é de nenhuma fatura)',
  verification_failed: 'Não confirmado na consulta ao Asaas',
  flagged_refund: 'Estorno marcado para conferência',
  ignored: 'Evento ignorado'
}

const NEEDS_REVIEW = new Set(['duplicate', 'amount_mismatch', 'cancelled_invoice', 'unmatched', 'verification_failed', 'flagged_refund'])

const statusStyle: Record<Invoice['status'], string> = {
  open: 'bg-amber-500/15 text-amber-300',
  paid: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-slate-700/60 text-slate-400'
}
const statusText: Record<Invoice['status'], string> = { open: 'Em aberto', paid: 'Paga', cancelled: 'Cancelada' }

// Consulta de pagamentos do painel geral: faturas, avisos do provedor e correção de inconsistências
export const MasterPayments: React.FC<{ onChanged: () => Promise<void> }> = ({ onChanged }) => {
  const [open, setOpen] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'review' | 'open' | 'paid' | 'all'>('review')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [inv, ev] = await Promise.all([adminFetchInvoices(), adminFetchPaymentEvents()])
      setInvoices(inv)
      setEvents(ev)
      setLoaded(true)
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && !loaded) load()
  }, [open, loaded, load])

  const flagged = invoices.filter((i) => i.flag)
  const reviewEvents = events.filter((e) => e.result && NEEDS_REVIEW.has(e.result))
  const reviewCount = flagged.length + reviewEvents.filter((e) => e.result === 'unmatched' || e.result === 'verification_failed').length

  const resolve = async (invoice: Invoice, action: 'mark_paid' | 'cancel' | 'clear_flag', message: string) => {
    if (!window.confirm(message)) return
    try {
      await adminResolveInvoice(invoice.id, action)
      await Promise.all([load(), onChanged()])
    } catch (err) {
      alert(friendlyError(err instanceof Error ? err.message : String(err)))
    }
  }

  const visible = invoices.filter((i) =>
    filter === 'all' ? true : filter === 'review' ? Boolean(i.flag) : filter === 'open' ? i.status === 'open' : i.status === 'paid'
  )

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl text-xs overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between gap-3 cursor-pointer text-left">
        <span className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Receipt className="w-4 h-4" />
          </span>
          <span>
            <span className="block font-bold text-sm text-white">Pagamentos e faturas</span>
            <span className="block text-slate-400 text-[11px]">Confirmações automáticas, avisos do Asaas e correções</span>
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {loaded && reviewCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">{reviewCount} p/ conferir</span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 overflow-x-auto">
              {([
                ['review', 'Conferir'],
                ['open', 'Em aberto'],
                ['paid', 'Pagas'],
                ['all', 'Todas']
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`px-3 py-1.5 rounded-xl font-bold shrink-0 cursor-pointer ${
                    filter === id ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              title="Atualizar"
              aria-label="Atualizar lista"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && <p className="text-rose-400">{error}</p>}

          {visible.length === 0 ? (
            <p className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-400">
              {filter === 'review' ? 'Nada para conferir. Tudo certo!' : 'Nenhuma fatura neste filtro.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {visible.slice(0, 60).map((inv) => (
                <li key={inv.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{inv.shop_name ?? 'Negócio removido'}</p>
                      <p className="text-slate-400 text-[11px]">
                        R$ {formatMoney(inv.paid_amount ?? inv.amount)} · vencimento {formatBR(inv.due_date)}
                        {inv.status === 'paid' && inv.paid_at
                          ? ` · paga em ${formatBR(inv.paid_at.slice(0, 10))} (${inv.payment_source === 'manual' ? 'manual' : 'automática'})`
                          : ''}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusStyle[inv.status]}`}>{statusText[inv.status]}</span>
                  </div>

                  {inv.flag && (
                    <p className="flex items-start gap-1.5 text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        {FLAG_TEXT[inv.flag]}
                        {inv.flag_note ? ` (${inv.flag_note})` : ''}
                      </span>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {inv.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() =>
                          resolve(inv, 'mark_paid', `Marcar a fatura de R$ ${formatMoney(inv.amount)} de ${inv.shop_name} como paga e liberar mais 30 dias?`)
                        }
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marcar como paga</span>
                      </button>
                    )}
                    {inv.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => resolve(inv, 'cancel', `Cancelar esta fatura de ${inv.shop_name}? A próxima é criada automaticamente.`)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 font-semibold cursor-pointer"
                      >
                        Cancelar fatura
                      </button>
                    )}
                    {inv.flag && (
                      <button
                        type="button"
                        onClick={() => resolve(inv, 'clear_flag', 'Marcar esta ocorrência como conferida?')}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 font-semibold cursor-pointer"
                      >
                        Já conferi
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1.5 pt-1">
            <p className="font-bold text-slate-200">Últimos avisos do Asaas</p>
            {events.length === 0 ? (
              <p className="text-slate-500">Nenhum aviso recebido ainda.</p>
            ) : (
              <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                {events.slice(0, 15).map((ev) => (
                  <li key={ev.id} className="px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-slate-300 truncate">{ev.event_type}</p>
                      <p className="text-[10px] text-slate-500">{new Date(ev.received_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold text-right ${
                        !ev.result ? 'text-amber-300' : NEEDS_REVIEW.has(ev.result) ? 'text-rose-300' : 'text-slate-400'
                      }`}
                    >
                      {ev.result ? RESULT_TEXT[ev.result] ?? ev.result : 'Aguardando reprocessamento'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
