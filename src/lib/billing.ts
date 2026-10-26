import type { Barbershop } from '../types'
import { getPlatformSettings } from './platform'

// Sistema pré-pago: 20 dias grátis; depois cada pagamento libera mais 30 dias.
export const TRIAL_DAYS = 20
export const PAID_PERIOD_DAYS = 30

export function getBaseFee(): number {
  return getPlatformSettings().monthly_fee
}

export function formatMoney(value: number): string {
  return value.toFixed(2).replace('.', ',')
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

export type BillingStatus = 'trial' | 'active' | 'expired' | 'blocked'

export interface BillingState {
  status: BillingStatus
  dueDate: string // último dia de acesso liberado
  daysLeft: number // dias restantes (negativo = vencido)
}

export function getBillingState(shop: Barbershop): BillingState {
  const dueDate = shop.next_billing_date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000)

  let status: BillingStatus
  if (shop.subscription_status === 'blocked') status = 'blocked'
  else if (daysLeft < 0) status = 'expired'
  else if (shop.subscription_status === 'trial') status = 'trial'
  else status = 'active'

  return { status, dueDate, daysLeft }
}

// O link público e o painel só funcionam com o período em dia
export const isServiceActive = (shop: Barbershop) => {
  const { status } = getBillingState(shop)
  return status === 'trial' || status === 'active'
}
