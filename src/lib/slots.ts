import type { WorkingHour } from '../types'
import type { BusySlot } from './db'
import { toDateStr } from './billing'

export interface Slot {
  time: string
  period: 'manha' | 'tarde' | 'noite'
  available: boolean
}

const SLOT_STEP = 30 // minutos

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart

// Horários do dia a partir do funcionamento do negócio, da duração escolhida e do que já está ocupado
export function buildSlots(opts: {
  date: string // YYYY-MM-DD
  hours?: WorkingHour
  duration: number
  busy: BusySlot[]
  barberIds: string[] // profissionais ativos
  selectedBarber: string // 'any' ou o id
  now?: Date
}): Slot[] {
  const { date, hours, duration, busy, barberIds, selectedBarber } = opts
  const now = opts.now ?? new Date()
  if (!hours || !hours.is_open) return []

  const open = toMin(hours.open_time)
  const close = toMin(hours.close_time)
  const lunchStart = hours.lunch_start ? toMin(hours.lunch_start) : null
  const lunchEnd = hours.lunch_end ? toMin(hours.lunch_end) : null
  const length = Math.max(duration, SLOT_STEP)
  const isToday = date === toDateStr(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const busyIntervals = busy.map((b) => ({
    barber: b.barber_id,
    start: toMin(b.start_time),
    end: toMin(b.start_time) + b.total_duration
  }))

  const slots: Slot[] = []
  for (let start = open; start + length <= close; start += SLOT_STEP) {
    const end = start + length
    let available = true

    if (lunchStart !== null && lunchEnd !== null && overlaps(start, end, lunchStart, lunchEnd)) continue
    if (isToday && start <= nowMin) available = false

    if (available) {
      const taken = (barber: string | undefined) =>
        busyIntervals.some((b) => b.barber === barber && overlaps(start, end, b.start, b.end))

      if (selectedBarber !== 'any') available = !taken(selectedBarber)
      else if (barberIds.length > 0) available = barberIds.some((id) => !taken(id))
      else available = !taken(undefined)
    }

    slots.push({ time: fmt(start), period: start < 12 * 60 ? 'manha' : start < 18 * 60 ? 'tarde' : 'noite', available })
  }
  return slots
}
