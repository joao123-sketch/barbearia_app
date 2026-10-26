import type { Appointment, Barber, Barbershop, Service, WorkingHour } from '../types'

// Cópia local dos dados do dono: o painel abre na hora com o que foi visto da última vez
// e atualiza em segundo plano (evita a "piscada" de carregamento ao abrir o app).
export interface OwnerSnapshot {
  shop: Barbershop
  services: Service[]
  barbers: Barber[]
  workingHours: WorkingHour[]
  appointments: Appointment[]
}

const KEY = 'owner_cache_v1:'

export function readOwnerCache(userId?: string): OwnerSnapshot | null {
  if (!userId) return null
  try {
    return JSON.parse(localStorage.getItem(KEY + userId) || 'null')
  } catch {
    return null
  }
}

export function writeOwnerCache(userId: string, snapshot: OwnerSnapshot) {
  try {
    localStorage.setItem(KEY + userId, JSON.stringify(snapshot))
  } catch {
    // armazenamento cheio ou bloqueado: o app funciona normalmente, só abre um pouco mais devagar
  }
}

export function clearOwnerCache() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(KEY)) localStorage.removeItem(k)
  } catch {
    // ignora
  }
}
