export interface Barbershop {
  id: string
  name: string
  slug: string
  slogan?: string
  description?: string
  logo_url?: string
  banner_url?: string
  phone_whatsapp: string
  address: string
  instagram?: string
  theme_color?: string
  created_at?: string
}

export interface Barber {
  id: string
  barbershop_id: string
  name: string
  avatar_url?: string
  role?: string
  bio?: string
  active: boolean
}

export interface Service {
  id: string
  barbershop_id: string
  name: string
  description?: string
  duration_minutes: number
  price: number
  category?: 'cabelo' | 'barba' | 'combo' | 'especial'
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
  notes?: string
  created_at: string
}
