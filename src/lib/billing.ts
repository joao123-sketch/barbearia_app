import type { Barbershop } from '../types'

// Sistema pré-pago: 20 dias grátis; depois cada pagamento libera mais 30 dias.
export const TRIAL_DAYS = 20
export const PAID_PERIOD_DAYS = 30

const moneyFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 1234.5 -> "1.234,50" (sem o símbolo R$, que cada tela escreve do seu jeito)
export function formatMoney(value: number): string {
  return moneyFormat.format(value)
}

// Datas locais "YYYY-MM-DD" (toISOString usaria o fuso UTC e erraria o dia à noite)
export function toDateStr(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function addDays(dateStr: string | Date, days: number): string {
  const base = typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : new Date(dateStr)
  base.setDate(base.getDate() + days)
  return toDateStr(base)
}

export function formatBR(dateStr?: string): string {
  return dateStr ? dateStr.split('-').reverse().join('/') : '—'
}

// trial/active: em dia · expired: vencida, ainda na carência (tudo funciona, com cobrança à vista)
// blocked: suspensa pela administração, sem o 1º pagamento ou além da carência (só a tela de cobrança abre)
export type BillingStatus = 'trial' | 'active' | 'expired' | 'blocked'
export type BlockReason = 'manual' | 'first_payment' | 'overdue'

// Dias de carência depois do vencimento (o valor real vem das configurações da plataforma)
export const DEFAULT_GRACE_DAYS = 10

export interface BillingState {
  status: BillingStatus
  dueDate: string // vencimento: último dia de acesso do período
  daysLeft: number // dias restantes (negativo = vencido)
  overdueDays: number // dias de atraso (0 se em dia)
  graceDaysLeft: number // dias até o bloqueio (só durante a carência)
  blockReason?: BlockReason
}

export function getBillingState(shop: Barbershop, graceDays = DEFAULT_GRACE_DAYS): BillingState {
  const dueDate = shop.next_billing_date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000)
  const overdueDays = Math.max(0, -daysLeft)
  const graceDaysLeft = Math.max(0, graceDays - overdueDays)

  let status: BillingStatus
  let blockReason: BlockReason | undefined
  if (shop.subscription_status === 'blocked') {
    status = 'blocked'
    blockReason = 'manual'
  } else if (shop.subscription_status === 'pending' && daysLeft < 0) {
    status = 'blocked'
    blockReason = 'first_payment'
  } else if (overdueDays > graceDays) {
    status = 'blocked'
    blockReason = 'overdue'
  } else if (daysLeft < 0) status = 'expired'
  else if (shop.subscription_status === 'trial') status = 'trial'
  else status = 'active'

  return { status, dueDate, daysLeft, overdueDays, graceDaysLeft, blockReason }
}

// O link público e o painel funcionam em dia e durante a carência; bloqueado só abre a cobrança
export const isServiceActive = (shop: Barbershop, graceDays = DEFAULT_GRACE_DAYS) => {
  return getBillingState(shop, graceDays).status !== 'blocked'
}
