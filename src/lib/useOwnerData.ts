import { useCallback, useEffect, useRef, useState } from 'react'
import type { Appointment, Barber, Barbershop, Service, WorkingHour } from '../types'
import {
  deleteShop,
  fetchAppointments,
  fetchMyShop,
  fetchPlatformSettings,
  fetchShopCatalog,
  friendlyError,
  saveWorkingHours,
  syncAppointments,
  syncBarbers,
  syncServices,
  updateMyShop
} from './db'
import { supabase } from './supabase'
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from './platform'

// Dados do dono logado: o negócio, serviços, equipe, horários e agendamentos, sempre em sincronia com o banco.
export function useOwnerData(userId: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Barbershop | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [platform, setPlatform] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS)

  // Cópias para comparar "antes e depois" ao gravar só o que mudou
  const servicesRef = useRef<Service[]>([])
  const barbersRef = useRef<Barber[]>([])
  const appointmentsRef = useRef<Appointment[]>([])
  const hoursTimer = useRef<number | undefined>(undefined)

  const loadFor = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setShop(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const mine = await fetchMyShop(uid)
      setShop(mine)
      if (mine) {
        const [catalog, apts, settings] = await Promise.all([
          fetchShopCatalog(mine.id),
          fetchAppointments(mine.id),
          fetchPlatformSettings()
        ])
        servicesRef.current = catalog.services
        barbersRef.current = catalog.barbers
        appointmentsRef.current = apts
        setServices(catalog.services)
        setBarbers(catalog.barbers)
        setWorkingHours(catalog.workingHours)
        setAppointments(apts)
        if (settings) setPlatform(settings)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Recarrega para quem está logado agora (lê a sessão na hora, sem depender de valores antigos da tela)
  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await loadFor(data.session?.user.id)
  }, [loadFor])

  useEffect(() => {
    loadFor(userId)
  }, [loadFor, userId])

  // Agendamentos novos feitos pelos clientes aparecem sem precisar recarregar
  useEffect(() => {
    if (!shop) return
    const shopId = shop.id
    const timer = window.setInterval(async () => {
      if (document.hidden) return
      try {
        const fresh = await fetchAppointments(shopId)
        appointmentsRef.current = fresh
        setAppointments(fresh)
      } catch {
        // sem rede: tenta de novo no próximo ciclo
      }
    }, 30000)
    return () => window.clearInterval(timer)
  }, [shop])

  const fail = (err: unknown) => {
    alert(friendlyError(err instanceof Error ? err.message : String(err)))
    load()
  }

  const updateShop = (next: Barbershop) => {
    setShop(next)
    updateMyShop(next).catch(fail)
  }

  const updateServices = (next: Service[]) => {
    if (!shop) return
    const prev = servicesRef.current
    servicesRef.current = next
    setServices(next)
    syncServices(shop.id, prev, next).catch(fail)
  }

  const updateBarbers = (next: Barber[]) => {
    if (!shop) return
    const prev = barbersRef.current
    barbersRef.current = next
    setBarbers(next)
    syncBarbers(shop.id, prev, next).catch(fail)
  }

  const updateAppointments = (next: Appointment[]) => {
    if (!shop) return
    const prev = appointmentsRef.current
    appointmentsRef.current = next
    setAppointments(next)
    syncAppointments(shop.id, prev, next).catch(fail)
  }

  // Os horários são salvos automaticamente a cada ajuste; espera um instante para juntar vários cliques
  const updateWorkingHours = (next: WorkingHour[]) => {
    if (!shop) return
    setWorkingHours(next)
    window.clearTimeout(hoursTimer.current)
    hoursTimer.current = window.setTimeout(() => saveWorkingHours(shop.id, next).catch(fail), 500)
  }

  const removeShop = async () => {
    if (!shop) return
    await deleteShop(shop.id)
    setShop(null)
  }

  return {
    loading,
    shop,
    services,
    barbers,
    workingHours,
    appointments,
    platform,
    reload: load,
    updateShop,
    updateServices,
    updateBarbers,
    updateAppointments,
    updateWorkingHours,
    removeShop
  }
}
