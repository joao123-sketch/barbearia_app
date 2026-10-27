import { supabase } from './supabase'
import type { Appointment, Barber, Barbershop, Service, WorkingHour } from '../types'
import type { PlatformSettings } from './platform'
import type { PushKeys } from './push'

// ---------- conversões banco <-> app ----------

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : undefined)

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export const newId = () => crypto.randomUUID()

function toShop(r: any): Barbershop {
  return {
    ...r,
    state: r.state?.trim() || undefined,
    blocked_dates: r.blocked_dates ?? [],
    monthly_fee: Number(r.monthly_fee ?? 0),
    next_monthly_fee: r.next_monthly_fee != null ? Number(r.next_monthly_fee) : undefined
  }
}

// Visão pública: sem cobrança; "service_active" diz se o link está liberado
function toPublicShop(r: any): Barbershop {
  return {
    ...toShop(r),
    monthly_fee: 0,
    subscription_status: r.service_active ? 'active' : 'blocked',
    next_billing_date: '',
    service_active: Boolean(r.service_active)
  }
}

const toService = (r: any): Service => ({
  ...r,
  description: r.description ?? undefined,
  category: r.category ?? undefined,
  combo_items: r.combo_items ?? undefined,
  price: Number(r.price)
})

const toBarber = (r: any): Barber => ({
  ...r,
  avatar_url: r.avatar_url ?? undefined,
  // O banco grava o cargo inicial sem acento
  role: r.role === 'Responsavel' ? 'Responsável' : (r.role ?? undefined),
  bio: r.bio ?? undefined,
  phone: r.phone ?? undefined
})

const toHours = (r: any): WorkingHour => ({
  day_of_week: r.day_of_week,
  day_name: r.day_name,
  is_open: r.is_open,
  open_time: hhmm(r.open_time)!,
  close_time: hhmm(r.close_time)!,
  lunch_start: hhmm(r.lunch_start),
  lunch_end: hhmm(r.lunch_end)
})

const toAppointment = (r: any): Appointment => ({
  ...r,
  barber_id: r.barber_id ?? undefined,
  start_time: hhmm(r.start_time)!,
  total_price: Number(r.total_price),
  reminder_preference: r.reminder_preference ?? undefined,
  notes: r.notes ?? undefined
})

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

// ---------- leitura ----------

export async function fetchMyShop(userId: string): Promise<Barbershop | null> {
  const data = check(await supabase.from('barbershops').select('*').eq('owner_id', userId).maybeSingle())
  return data ? toShop(data) : null
}

export async function fetchPublicShopBySlug(slug: string): Promise<Barbershop | null> {
  const data = check(await supabase.from('public_barbershops').select('*').eq('slug', slug).maybeSingle())
  return data ? toPublicShop(data) : null
}

export async function fetchShopCatalog(shopId: string) {
  const [services, barbers, hours] = await Promise.all([
    supabase.from('services').select('*').eq('barbershop_id', shopId).order('created_at'),
    supabase.from('barbers').select('*').eq('barbershop_id', shopId).order('created_at'),
    supabase.from('working_hours').select('*').eq('barbershop_id', shopId).order('day_of_week')
  ])
  return {
    services: (check(services) ?? []).map(toService),
    barbers: (check(barbers) ?? []).map(toBarber),
    workingHours: (check(hours) ?? []).map(toHours)
  }
}

export async function fetchAppointments(shopId: string): Promise<Appointment[]> {
  const rows = check(
    await supabase.from('appointments').select('*').eq('barbershop_id', shopId).order('appointment_date').order('start_time')
  )
  return (rows ?? []).map(toAppointment)
}

export interface BusySlot {
  barber_id?: string
  start_time: string
  total_duration: number
}

export async function fetchBusySlots(shopId: string, date: string): Promise<BusySlot[]> {
  const rows = (check(await supabase.rpc('get_busy_slots', { p_shop: shopId, p_date: date })) as any[] | null) ?? []
  return rows.map((r) => ({
    barber_id: (r.barber_id as string | null) ?? undefined,
    start_time: hhmm(r.start_time)!,
    total_duration: Number(r.total_duration)
  }))
}

export async function fetchPlatformSettings(): Promise<PlatformSettings | null> {
  const r = check(await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle())
  if (!r) return null
  return {
    monthly_fee: Number(r.monthly_fee),
    pix_key: r.pix_key ?? '',
    pix_name: r.pix_name ?? '',
    pix_bank: r.pix_bank ?? '',
    pix_qrcode: r.pix_qrcode ?? '',
    contact_whatsapp: r.contact_whatsapp ?? ''
  }
}

export async function savePlatformSettingsDb(s: PlatformSettings) {
  check(
    await supabase
      .from('platform_settings')
      .update({ ...s, updated_at: new Date().toISOString() })
      .eq('id', 1)
  )
}

export async function isPlatformAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc('is_platform_admin')
  return Boolean(data)
}

// ---------- gravação do dono ----------

const SHOP_FIELDS = [
  'name', 'slug', 'owner_name', 'slogan', 'description', 'logo_url', 'banner_url', 'phone_whatsapp', 'street', 'number',
  'neighborhood', 'city', 'state', 'reference_point', 'address', 'instagram', 'style_preset', 'business_type', 'app_icon'
] as const

export async function updateMyShop(shop: Barbershop) {
  const patch: Record<string, unknown> = {}
  for (const f of SHOP_FIELDS) patch[f] = (shop as any)[f] ?? null
  patch.blocked_dates = shop.blocked_dates ?? []
  check(await supabase.from('barbershops').update(patch).eq('id', shop.id))
}

export async function deleteShop(shopId: string) {
  check(await supabase.from('barbershops').delete().eq('id', shopId))
}

// Compara a lista anterior com a nova e grava só o que mudou
async function syncRows<T extends { id: string }>(table: string, prev: T[], next: T[], toRow: (x: T) => Record<string, unknown>) {
  const prevById = new Map(prev.map((p) => [p.id, p]))
  const nextIds = new Set(next.map((n) => n.id))

  const removed = prev.filter((p) => !nextIds.has(p.id)).map((p) => p.id)
  if (removed.length) check(await supabase.from(table).delete().in('id', removed))

  const changed = next.filter((n) => {
    const before = prevById.get(n.id)
    return !before || JSON.stringify(before) !== JSON.stringify(n)
  })
  if (changed.length) check(await supabase.from(table).upsert(changed.map(toRow)))
}

export const syncServices = (shopId: string, prev: Service[], next: Service[]) =>
  syncRows('services', prev, next, (s) => ({
    id: s.id, barbershop_id: shopId, name: s.name, description: s.description ?? null,
    duration_minutes: s.duration_minutes, price: s.price, category: s.category ?? null,
    combo_items: s.combo_items ?? null, active: s.active
  }))

export const syncBarbers = (shopId: string, prev: Barber[], next: Barber[]) =>
  syncRows('barbers', prev, next, (b) => ({
    id: b.id, barbershop_id: shopId, name: b.name, avatar_url: b.avatar_url ?? null, role: b.role ?? null,
    bio: b.bio ?? null, phone: b.phone ?? null, active: b.active !== false
  }))

export const syncAppointments = (shopId: string, prev: Appointment[], next: Appointment[]) =>
  syncRows('appointments', prev, next, (a) => ({
    id: a.id, barbershop_id: shopId, barber_id: a.barber_id ?? null, service_ids: a.service_ids,
    client_name: a.client_name, client_phone: a.client_phone, appointment_date: a.appointment_date,
    start_time: a.start_time, total_price: a.total_price, total_duration: a.total_duration, status: a.status,
    reminder_preference: a.reminder_preference ?? null, notes: a.notes ?? null
  }))

export async function saveWorkingHours(shopId: string, hours: WorkingHour[]) {
  check(
    await supabase.from('working_hours').upsert(
      hours.map((h) => ({
        barbershop_id: shopId, day_of_week: h.day_of_week, day_name: h.day_name, is_open: h.is_open,
        open_time: h.open_time, close_time: h.close_time, lunch_start: h.lunch_start || null, lunch_end: h.lunch_end || null
      })),
      { onConflict: 'barbershop_id,day_of_week' }
    )
  )
}

// Horário padrão de um negócio novo: segunda a sábado 09h–19h, almoço 12h–13h, domingo fechado
export function defaultWorkingHours(): WorkingHour[] {
  return DAY_NAMES.map((day_name, day_of_week) => ({
    day_of_week,
    day_name,
    is_open: day_of_week !== 0,
    open_time: '09:00',
    close_time: '19:00',
    lunch_start: '12:00',
    lunch_end: '13:00'
  }))
}

// ---------- notificações push ----------

export async function saveOwnerPush(shopId: string, keys: PushKeys) {
  const { error } = await supabase.from('push_subscriptions').insert({
    kind: 'owner',
    barbershop_id: shopId,
    endpoint: keys.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth
  })
  // 23505 = este aparelho já estava cadastrado
  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function hasOwnerPush(shopId: string, endpoint: string): Promise<boolean> {
  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'owner')
    .eq('barbershop_id', shopId)
    .eq('endpoint', endpoint)
  return (count ?? 0) > 0
}

export async function removeOwnerPush(shopId: string, endpoint: string) {
  check(await supabase.from('push_subscriptions').delete().eq('kind', 'owner').eq('barbershop_id', shopId).eq('endpoint', endpoint))
}

// Pede ao servidor para mandar uma notificação de teste a todos os aparelhos do dono
export async function sendOwnerTestPush(shopId: string) {
  check(await supabase.rpc('send_owner_test_push', { p_shop: shopId }))
}

export async function registerClientPush(appointmentId: string, keys: PushKeys) {
  check(
    await supabase.rpc('register_client_push', {
      p_appointment: appointmentId,
      p_endpoint: keys.endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth
    })
  )
}

// ---------- cadastro do dono ----------

export async function registerBarbershop(payload: Record<string, unknown>, team: string[]): Promise<string> {
  const id = check(await supabase.rpc('register_barbershop', { p: payload, p_team: team }))
  return id as string
}

// Mensalidade que aparece na tela de cadastro (pública, só o valor)
export async function fetchMonthlyFee(): Promise<number | null> {
  const { data } = await supabase.rpc('get_monthly_fee')
  return data != null ? Number(data) : null
}

// ---------- agendamento pelo cliente ----------

export async function createPublicAppointment(input: {
  shopId: string
  barberId?: string
  serviceIds: string[]
  clientName: string
  clientPhone: string
  date: string
  start: string
  notes?: string
  reminder?: string
}) {
  const id = check(
    await supabase.rpc('create_public_appointment', {
      p_shop: input.shopId,
      p_barber: input.barberId ?? null,
      p_service_ids: input.serviceIds,
      p_client_name: input.clientName,
      p_client_phone: input.clientPhone,
      p_date: input.date,
      p_start: input.start,
      p_notes: input.notes ?? null,
      p_reminder: input.reminder ?? null
    })
  )
  return id as string
}

// Mensagens amigáveis para os erros do banco e do login
export function friendlyError(message: string): string {
  const map: Record<string, string> = {
    slot_taken: 'Esse horário acabou de ser ocupado. Escolha outro.',
    shop_unavailable: 'Este espaço está temporariamente indisponível para agendamentos.',
    outside_hours: 'Esse horário está fora do funcionamento.',
    day_blocked: 'Não há atendimento neste dia.',
    date_in_past: 'Escolha uma data a partir de hoje.',
    invalid_name: 'Informe seu nome.',
    invalid_phone: 'Informe um WhatsApp válido com DDD.',
    invalid_services: 'Algum serviço escolhido não está mais disponível.',
    invalid_barber: 'Esse profissional não está disponível.',
    phone_already_registered: 'Já existe uma conta com este WhatsApp.',
    account_already_has_business: 'Esta conta já tem um negócio cadastrado.',
    'User already registered': 'Já existe uma conta com este e-mail.',
    'Invalid login credentials': 'Usuário ou senha incorretos.',
    'is invalid': 'Este e-mail não é aceito. Confira o endereço ou use outro.',
    barbershops_slug_key: 'Este link já está em uso. Escolha outro nome de link.',
    barbershops_phone_whatsapp_key: 'Já existe uma conta com este WhatsApp.'
  }
  for (const key of Object.keys(map)) if (message.includes(key)) return map[key]
  return message
}

// ---------- painel geral (só administrador) ----------

export async function fetchAllShops(): Promise<Barbershop[]> {
  const rows = check(await supabase.from('barbershops').select('*').order('created_at', { ascending: false }))
  return (rows ?? []).map(toShop)
}

export const adminConfirmPayment = async (shopId: string) => check(await supabase.rpc('admin_confirm_payment', { p_shop: shopId }))
export const adminSetBlocked = async (shopId: string, blocked: boolean) =>
  check(await supabase.rpc('admin_set_blocked', { p_shop: shopId, p_blocked: blocked }))
// Mensalidade de uma conta: já neste ciclo (applyNow) ou só a partir do próximo pagamento
export const adminSetShopFee = async (shopId: string, fee: number, applyNow: boolean) =>
  check(await supabase.rpc('admin_set_shop_fee', { p_shop: shopId, p_fee: fee, p_apply_now: applyNow }))

// Reajuste percentual em todas as contas, a partir do próximo pagamento
export const adminRaiseFeesPercent = async (percent: number) =>
  check(await supabase.rpc('admin_raise_fees_percent', { p_percent: percent })) as number

export const adminScheduleFee = async (fee: number, shopId?: string) =>
  check(await supabase.rpc('admin_schedule_fee', { p_fee: fee, p_shop: shopId ?? null }))

// Números agregados por negócio (sem nenhum dado dos clientes finais) — só o administrador consegue chamar
export interface ShopMetrics {
  shop_id: string
  services_count: number
  team_count: number
  done_total: number
  cancelled_total: number
  upcoming_total: number
  revenue_total: number
  revenue_this_month: number
  revenue_last_month: number
  done_this_month: number
  worked_hours_total: number
  worked_hours_per_active_day: number
  last_activity: string | null
  booked_this_week: number
  revenue_this_week: number
  avg_per_week: number
}

export async function adminFetchShopMetrics(): Promise<Record<string, ShopMetrics>> {
  const rows = check(await supabase.rpc('admin_shop_metrics')) as any[] | null
  const map: Record<string, ShopMetrics> = {}
  for (const r of rows ?? []) {
    map[r.shop_id] = {
      ...r,
      revenue_total: Number(r.revenue_total),
      revenue_this_month: Number(r.revenue_this_month),
      revenue_last_month: Number(r.revenue_last_month),
      worked_hours_total: Number(r.worked_hours_total),
      worked_hours_per_active_day: Number(r.worked_hours_per_active_day),
      revenue_this_week: Number(r.revenue_this_week ?? 0),
      avg_per_week: Number(r.avg_per_week ?? 0),
      booked_this_week: Number(r.booked_this_week ?? 0)
    }
  }
  return map
}
