import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { logoToAppIcon } from './image'
import { readOwnerCache, writeOwnerCache } from './ownerCache'
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from './platform'

// Dados do dono logado: o negócio, serviços, equipe, horários e agendamentos, sempre em sincronia com o banco.
export function useOwnerData(userId: string | undefined) {
  // Com cópia local o painel abre na hora; sem ela (primeiro acesso) mostra o carregamento
  const cached = useMemo(() => readOwnerCache(userId), [userId])
  const [loading, setLoading] = useState(() => !cached)
  const [shop, setShop] = useState<Barbershop | null>(() => cached?.shop ?? null)
  const [services, setServices] = useState<Service[]>(() => cached?.services ?? [])
  const [barbers, setBarbers] = useState<Barber[]>(() => cached?.barbers ?? [])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(() => cached?.workingHours ?? [])
  const [appointments, setAppointments] = useState<Appointment[]>(() => cached?.appointments ?? [])
  const [platform, setPlatform] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS)

  // Cópias para comparar "antes e depois" ao gravar só o que mudou
  const servicesRef = useRef<Service[]>(cached?.services ?? [])
  const barbersRef = useRef<Barber[]>(cached?.barbers ?? [])
  const appointmentsRef = useRef<Appointment[]>(cached?.appointments ?? [])
  const hoursTimer = useRef<number | undefined>(undefined)
  const shopRef = useRef<Barbershop | null>(cached?.shop ?? null)

  const loadFor = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setShop(null)
      setLoading(false)
      return
    }
    // Se já há dados na tela, atualiza em silêncio (sem voltar para o carregamento)
    if (!shopRef.current) setLoading(true)
    try {
      const mine = await fetchMyShop(uid)
      shopRef.current = mine
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

  // Guarda a cópia local sempre que os dados mudam
  useEffect(() => {
    if (userId && shop) writeOwnerCache(userId, { shop, services, barbers, workingHours, appointments })
  }, [userId, shop, services, barbers, workingHours, appointments])

  // Agendamentos novos feitos pelos clientes aparecem na hora (tempo real), com atualização
  // de segurança ao voltar para o app e a cada 15 segundos caso a conexão em tempo real caia.
  const shopId = shop?.id
  useEffect(() => {
    if (!shopId) return
    let busy = false
    let debounce: number | undefined
    const refresh = async () => {
      if (busy || document.hidden) return
      busy = true
      try {
        const fresh = await fetchAppointments(shopId)
        appointmentsRef.current = fresh
        setAppointments(fresh)
      } catch {
        // sem rede: tenta de novo no próximo ciclo
      } finally {
        busy = false
      }
    }
    const channel = supabase
      .channel(`appointments:${shopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `barbershop_id=eq.${shopId}` },
        () => {
          window.clearTimeout(debounce)
          debounce = window.setTimeout(refresh, 250)
        }
      )
      .subscribe()
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const timer = window.setInterval(refresh, 15000)
    return () => {
      window.clearTimeout(debounce)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      supabase.removeChannel(channel)
    }
  }, [shopId])

  // Negócios antigos ainda sem ícone PNG: gera da logo uma vez para o app instalar com ela
  const iconTried = useRef(false)
  useEffect(() => {
    if (!shop || !shop.logo_url || shop.app_icon || iconTried.current) return
    iconTried.current = true
    logoToAppIcon(shop.logo_url)
      .then((icon) => {
        const next = { ...shop, app_icon: icon }
        shopRef.current = next
        setShop(next)
        return updateMyShop(next)
      })
      .catch(() => {})
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
