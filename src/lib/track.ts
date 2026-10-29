import { supabase } from './supabase'

// Medição do funil de cadastro (só contagens, sem dados pessoais). Nunca atrapalha a tela: erro é ignorado.
export type TrackEvent = 'login_visit' | 'signup_click' | 'founder_click' | 'signup_open' | 'signup_done'

const lastSent: Partial<Record<TrackEvent, number>> = {}

export function track(event: TrackEvent, oncePerSession = false) {
  try {
    if (oncePerSession) {
      const key = `track_${event}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    }
  } catch {
    // sem armazenamento: conta a cada carregamento
  }
  // Evita contar duas vezes o mesmo evento disparado em sequência (efeito duplicado do React em desenvolvimento)
  const now = Date.now()
  if (now - (lastSent[event] ?? 0) < 1000) return
  lastSent[event] = now
  Promise.resolve(supabase.rpc('track_event', { p_event: event })).catch(() => {})
}

export interface EventCounts {
  today: number
  last_7: number
  last_30: number
  total: number
}

export async function adminFetchEventCounts(): Promise<Partial<Record<TrackEvent, EventCounts>>> {
  const { data, error } = await supabase.rpc('admin_event_counts')
  if (error) throw error
  const map: Partial<Record<TrackEvent, EventCounts>> = {}
  for (const r of (data ?? []) as Array<EventCounts & { event: TrackEvent }>) map[r.event] = r
  return map
}
