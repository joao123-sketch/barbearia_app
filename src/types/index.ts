export type SubscriptionStatus = 'trial' | 'active' | 'pending' | 'overdue' | 'blocked'

export type ShopStylePreset = 'elegante' | 'sofisticado' | 'moderno' | 'minimalista' | 'simples' | 'rosa' | 'azul' | 'neutro'

export type BusinessType = 'barbearia' | 'salao'

export interface Barbershop {
  business_type?: BusinessType
  id: string
  name: string
  slug: string
  owner_name?: string
  owner_email?: string
  slogan?: string
  description?: string
  logo_url?: string
  banner_url?: string
  phone_whatsapp: string
  address: string
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string // UF
  reference_point?: string
  instagram?: string
  theme_color?: string
  style_preset?: ShopStylePreset
  created_at?: string
  // Assinatura SaaS & Cobrança
  monthly_fee: number
  next_monthly_fee?: number
  subscription_status: SubscriptionStatus
  due_day?: number
  next_billing_date: string // pré-pago: último dia de acesso (fim do teste ou do período pago)
  last_payment_date?: string
  pix_key?: string
  // Pausas e Bloqueios de Agenda (Viagens / Férias)
  blocked_dates?: string[] // Ex: ["2026-11-15", "2026-11-16"]
}


export interface Barber {
  id: string
  barbershop_id: string
  name: string
  avatar_url?: string
  role?: string
  bio?: string
  phone?: string
  active: boolean
  is_active?: boolean
}

export interface Service {
  id: string
  barbershop_id: string
  name: string
  description?: string
  duration_minutes: number
  price: number
  category?: string // livre e opcional: o dono cria as categorias que quiser
  combo_items?: string[]
  active: boolean
}

export interface WorkingHour {
  day_of_week: number // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  day_name: string
  is_open: boolean
  open_time: string // "09:00"
  close_time: string // "19:00"
  lunch_start?: string // "12:00"
  lunch_end?: string // "13:00"
}

export interface Appointment {
  id: string
  barbershop_id: string
  barber_id?: string
  service_ids: string[]
  client_name: string
  client_phone: string
  appointment_date: string // "YYYY-MM-DD"
  start_time: string // "14:30"
  total_price: number
  total_duration: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  reminder_preference?: '10min' | '30min' | '1hour'
  notes?: string
  created_at: string
}
