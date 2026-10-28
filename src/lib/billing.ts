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

const pad2 = (n: number) => String(n).padStart(2, '0')

// "AAAA-MM-DD" -> número do dia (contagem em UTC: não depende do fuso nem do horário de verão do aparelho)
const dayNumber = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000
}

export function addDays(dateStr: string | Date, days: number): string {
  if (typeof dateStr === 'string') {
    const [y, m, d] = dateStr.split('-').map(Number)
    const moved = new Date(Date.UTC(y, m - 1, d + days))
    return `${moved.getUTCFullYear()}-${pad2(moved.getUTCMonth() + 1)}-${pad2(moved.getUTCDate())}`
  }
  const base = new Date(dateStr)
  base.setDate(base.getDate() + days)
  return toDateStr(base)
}

// Hoje em Brasília, como o banco calcula (public.today_br). Quem usa o app em outro fuso (Manaus, Rio Branco)
// vê o mesmo dia que as regras de bloqueio do servidor.
const brDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
export const todayBR = (now: Date = new Date()): string => brDate.format(now)

export function formatBR(dateStr?: string): string {
  return dateStr ? dateStr.split('-').reverse().join('/') : '—'
}

// trial/active: em dia · expired: vencida, ainda na carência (tudo funciona, com cobrança à vista)
// blocked: suspensa pela administração, sem o 1º pagamento ou além da carência (só a tela de cobrança abre)
export type BillingStatus = 'trial' | 'active' | 'expired' | 'blocked'
export type BlockReason = 'manual' | 'first_payment' | 'overdue'

// Dias de carência depois do vencimento (o valor real vem das configurações da plataforma)
export const DEFAULT_GRACE_DAYS = 10

// Limites aceitos pelo banco (platform_settings.grace_days: between 0 and 60)
export const GRACE_MIN = 0
export const GRACE_MAX = 60

// O que foi digitado no campo da carência: só inteiro de 0 a 60 vale. Nada é corrigido em silêncio.
export type GraceInput = { ok: true; value: number } | { ok: false; reason: 'empty' | 'invalid' | 'decimal' | 'range' }

export function parseGraceInput(text: string): GraceInput {
  const t = String(text).trim().replace(',', '.')
  if (t === '') return { ok: false, reason: 'empty' }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { ok: false, reason: 'invalid' }
  const n = Number(t)
  if (!Number.isInteger(n)) return { ok: false, reason: 'decimal' }
  if (n < GRACE_MIN || n > GRACE_MAX) return { ok: false, reason: 'range' }
  return { ok: true, value: n }
}

// O que vai para o banco quando o administrador salva a carência (uma coluna, sempre dentro dos limites).
// Valor inválido não é corrigido em silêncio: lança o mesmo erro que o banco daria ("entre 0 e 60 dias").
export const graceUpdatePayload = (days: number, nowIso: string) => {
  if (!Number.isInteger(days) || days < GRACE_MIN || days > GRACE_MAX) throw new Error('grace_days_check')
  return { grace_days: days, updated_at: nowIso }
}

// Campos que o servidor muda sozinho (pagamento confirmado, bloqueio, reajuste). A releitura periódica do painel
// do dono atualiza só estes e nunca mexe no que a pessoa está editando (nome, logo, textos...).
const BILLING_FIELDS = ['subscription_status', 'next_billing_date', 'monthly_fee', 'next_monthly_fee', 'last_payment_date'] as const

export function mergeBillingFields(current: Barbershop, fresh: Barbershop): Barbershop {
  const changed = BILLING_FIELDS.some((f) => current[f] !== fresh[f])
  if (!changed) return current // mesma referência: nada a redesenhar
  const next: Barbershop = { ...current }
  for (const f of BILLING_FIELDS) (next as unknown as Record<string, unknown>)[f] = fresh[f]
  return next
}

// O banco não dá erro quando recusa por permissão: devolve zero linhas. Sem linha gravada, não houve sucesso.
export function requireSavedGrace(rows: ReadonlyArray<{ grace_days: number }> | null | undefined): number {
  if (!rows || rows.length === 0) throw new Error('forbidden')
  return Number(rows[0].grace_days)
}

// O formulário de PIX nunca grava a carência: ela só muda pelo cartão próprio (evita sobrescrever com valor velho)
export function withoutGrace<T extends { grace_days?: number }>(settings: T): Omit<T, 'grace_days'> {
  const { grace_days: _grace, ...rest } = settings
  return rest
}

// Primeiro dia sem acesso: o dia seguinte ao último dia de carência
export const firstBlockedDate = (dueDate: string, graceDays: number): string => addDays(dueDate, graceDays + 1)

export interface BillingState {
  status: BillingStatus
  dueDate: string // vencimento: último dia de acesso do período
  daysLeft: number // dias restantes (negativo = vencido)
  overdueDays: number // dias de atraso (0 se em dia)
  graceDaysLeft: number // dias até o bloqueio (só durante a carência)
  blockReason?: BlockReason
}

export function getBillingState(shop: Barbershop, graceDays = DEFAULT_GRACE_DAYS, now: Date = new Date()): BillingState {
  const dueDate = shop.next_billing_date
  const daysLeft = dayNumber(dueDate) - dayNumber(todayBR(now))
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
