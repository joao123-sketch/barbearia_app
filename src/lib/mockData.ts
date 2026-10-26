import type { Barbershop, Barber, Service, WorkingHour, Appointment } from '../types'


export const demoBarbershop: Barbershop = {
  id: 'barber-001',
  name: 'NK Barbearia Premium',
  slug: 'nk-barbearia',
  slogan: 'Tradição, estilo e o melhor atendimento da cidade.',
  description: 'Ambiente climatizado, cerveja gelada, sinuca e os melhores profissionais especializados em corte clássico e degradê moderno.',
  logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80',
  banner_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
  phone_whatsapp: '5511999998888',
  address: 'Av. Paulista, 1500 - Sala 42, Bela Vista, São Paulo - SP',
  instagram: '@nkbarbearia',
  theme_color: '#EAB308',
  created_at: new Date().toISOString()
}

export const demoBarbers: Barber[] = [
  {
    id: 'barber-1',
    barbershop_id: 'barber-001',
    name: 'Nataniel Costa (NK)',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    role: 'Master Barber / Fundador',
    bio: 'Especialista em visagismo masculino e navalhado há mais de 10 anos.',
    active: true
  },
  {
    id: 'barber-2',
    barbershop_id: 'barber-001',
    name: 'Lucas "Tesoura de Ouro"',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    role: 'Barbeiro Especialista',
    bio: 'Foco em cortes modernos, freestyle e tratamentos capilares.',
    active: true
  }
]

export const demoServices: Service[] = [
  {
    id: 'serv-1',
    barbershop_id: 'barber-001',
    name: 'Corte Cabelo Masculino',
    description: 'Corte na tesoura ou máquina com acabamento e finalização com pomada modeladora.',
    duration_minutes: 35,
    price: 45.00,
    category: 'cabelo',
    active: true
  },
  {
    id: 'serv-2',
    barbershop_id: 'barber-001',
    name: 'Barba Completa (Terapia & Toalha Quente)',
    description: 'Desenho da barba, alinhamento na navalha, esfoliação facial e toalha quente relaxante.',
    duration_minutes: 30,
    price: 35.00,
    category: 'barba',
    active: true
  },
  {
    id: 'serv-3',
    barbershop_id: 'barber-001',
    name: 'Combo Completo (Cabelo + Barba VIP)',
    description: 'O serviço mais pedido: corte completo, barba com toalha quente e sobrancelha cortesia.',
    duration_minutes: 60,
    price: 70.00,
    category: 'combo',
    active: true
  },
  {
    id: 'serv-4',
    barbershop_id: 'barber-001',
    name: 'Acabamento / Pezinho',
    description: 'Limpeza rápida das laterais, nuca e contorno com navalha.',
    duration_minutes: 15,
    price: 20.00,
    category: 'cabelo',
    active: true
  },
  {
    id: 'serv-5',
    barbershop_id: 'barber-001',
    name: 'Platinado / Pigmentação Capilar',
    description: 'Descoloração global premium sem agredir os fios ou camuflagem de fios brancos.',
    duration_minutes: 90,
    price: 120.00,
    category: 'especial',
    active: true
  }
]

export const demoWorkingHours: WorkingHour[] = [
  { day_of_week: 0, day_name: 'Domingo', is_open: false, open_time: '09:00', close_time: '14:00' },
  { day_of_week: 1, day_name: 'Segunda-feira', is_open: true, open_time: '09:00', close_time: '20:00', lunch_start: '12:30', lunch_end: '13:30' },
  { day_of_week: 2, day_name: 'Terça-feira', is_open: true, open_time: '09:00', close_time: '20:00', lunch_start: '12:30', lunch_end: '13:30' },
  { day_of_week: 3, day_name: 'Quarta-feira', is_open: true, open_time: '09:00', close_time: '20:00', lunch_start: '12:30', lunch_end: '13:30' },
  { day_of_week: 4, day_name: 'Quinta-feira', is_open: true, open_time: '09:00', close_time: '20:00', lunch_start: '12:30', lunch_end: '13:30' },
  { day_of_week: 5, day_name: 'Sexta-feira', is_open: true, open_time: '08:30', close_time: '21:00', lunch_start: '12:30', lunch_end: '13:30' },
  { day_of_week: 6, day_name: 'Sábado', is_open: true, open_time: '08:00', close_time: '19:00', lunch_start: '12:00', lunch_end: '13:00' }
]

export const demoAppointments: Appointment[] = [
  {
    id: 'apt-1',
    barbershop_id: 'barber-001',
    barber_id: 'barber-1',
    service_ids: ['serv-3'],
    client_name: 'Carlos Mendes',
    client_phone: '11988887777',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    total_price: 70.00,
    total_duration: 60,
    status: 'confirmed',
    notes: 'Prefere corte degradê na navalha',
    created_at: new Date().toISOString()
  },
  {
    id: 'apt-2',
    barbershop_id: 'barber-001',
    barber_id: 'barber-2',
    service_ids: ['serv-1'],
    client_name: 'Felipe Alencar',
    client_phone: '11977776666',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '11:30',
    total_price: 45.00,
    total_duration: 35,
    status: 'confirmed',
    created_at: new Date().toISOString()
  },
  {
    id: 'apt-3',
    barbershop_id: 'barber-001',
    barber_id: 'barber-1',
    service_ids: ['serv-2'],
    client_name: 'Rodrigo Silva',
    client_phone: '11966665555',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    total_price: 35.00,
    total_duration: 30,
    status: 'pending',
    created_at: new Date().toISOString()
  }
]
