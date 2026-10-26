// Notificações push no navegador/app instalado. A chave pública é pública por desenho (a privada fica só no Supabase).
export const VAPID_PUBLIC_KEY =
  'BEyxtBujv0qvySfzgSF0Km8rfV5Y13E46fuduEEiTRH7j0fe4BQ0FcFWma-1PpJrlPqpQyBmpfc-z4MxoyxB5-4'

export interface PushKeys {
  endpoint: string
  p256dh: string
  auth: string
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true

export type PushSupport = 'ok' | 'ios-install' | 'unsupported'

// No iPhone as notificações só funcionam com o app instalado na tela inicial (iOS 16.4 ou mais novo)
export function pushSupport(): PushSupport {
  if (isIos() && !isStandalone()) return 'ios-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  'Notification' in window ? Notification.permission : 'unsupported'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

const toKeys = (sub: PushSubscription): PushKeys => {
  const json = sub.toJSON()
  return { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' }
}

export async function currentPushKeys(): Promise<PushKeys | null> {
  if (pushSupport() !== 'ok') return null
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? toKeys(sub) : null
}

// Pede a permissão e cadastra este aparelho para receber notificações
export async function subscribePush(): Promise<PushKeys> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('permission_denied')
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }))
  return toKeys(sub)
}

export async function unsubscribePush(): Promise<string | null> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return null
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  return endpoint
}

// Aviso de teste local (confirma que o aparelho está pronto para receber)
export async function showTestNotification() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('SuaAgenda', {
    body: 'Pronto! Você vai receber um aviso a cada agendamento novo.',
    icon: '/icon-192.png'
  })
}
