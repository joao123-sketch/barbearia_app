// Edge Function: envia as notificações push que estão vencidas na fila.
//  - owner_new: avisa o dono de um agendamento novo
//  - client_reminder: lembra o cliente antes do horário
//  - owner_test: aviso de teste pedido pelo dono em Configurações
//  - billing_reminder: lembrete de mensalidade (antes e depois do vencimento), programado por billing_daily()
// Quem chama é o próprio banco (gatilho do agendamento e agendador de 1 minuto), com o segredo no cabeçalho.
// Segredos usados (definidos no painel do Supabase): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, NOTIFY_SECRET.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:sistemaappbarbearia@gmail.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

const TZ = 'America/Sao_Paulo'

const formatDate = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')
const formatTime = (t: string) => t.slice(0, 5)

async function sendTo(
  subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: Record<string, unknown>
) {
  let delivered = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 }
      )
      delivered++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      // Aparelho que desinstalou ou revogou a permissão: remove da lista
      if (status === 404 || status === 410) await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      else console.error('push error', status, (err as Error).message)
    }
  }
  return delivered
}

Deno.serve(async (req) => {
  if (req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET')) {
    return new Response('forbidden', { status: 403 })
  }

  const { data: due } = await supabase
    .from('notification_queue')
    .select('id, kind, appointment_id, barbershop_id, title, body')
    .is('sent_at', null)
    .lte('send_at', new Date().toISOString())
    .order('send_at')
    .limit(50)

  let processed = 0
  let delivered = 0

  for (const item of due ?? []) {
    // "Reserva" o item para que duas execuções ao mesmo tempo não enviem em duplicidade
    const { data: claimed } = await supabase
      .from('notification_queue')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', item.id)
      .is('sent_at', null)
      .select('id')
    if (!claimed || claimed.length === 0) continue
    processed++

    // Aviso de teste do dono: não depende de agendamento
    if (item.kind === 'owner_test') {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('kind', 'owner')
        .eq('barbershop_id', item.barbershop_id)
      delivered += await sendTo(subs ?? [], {
        title: 'Aviso de teste',
        body: 'Tudo certo! Você vai receber um aviso a cada agendamento novo.',
        url: '/admin',
        tag: 'teste'
      })
      continue
    }

    // Lembrete de mensalidade (programado pelo banco, um por marco de vencimento)
    if (item.kind === 'billing_reminder') {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('kind', 'owner')
        .eq('barbershop_id', item.barbershop_id)
      delivered += await sendTo(subs ?? [], {
        title: item.title ?? 'Mensalidade do SuaAgenda',
        body: item.body ?? 'Abra o app para ver a sua mensalidade.',
        url: '/admin',
        tag: 'cobranca'
      })
      continue
    }

    const { data: apt } = await supabase
      .from('appointments')
      .select('id, barbershop_id, client_name, appointment_date, start_time, status, service_ids')
      .eq('id', item.appointment_id)
      .maybeSingle()
    if (!apt || apt.status === 'cancelled') continue

    const { data: shop } = await supabase
      .from('barbershops')
      .select('name, slug')
      .eq('id', apt.barbershop_id)
      .maybeSingle()
    const { data: services } = await supabase.from('services').select('name').in('id', apt.service_ids ?? [])
    const serviceNames = (services ?? []).map((s) => s.name).join(' + ') || 'Atendimento'

    if (item.kind === 'owner_new') {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('kind', 'owner')
        .eq('barbershop_id', apt.barbershop_id)
      delivered += await sendTo(subs ?? [], {
        title: 'Novo agendamento',
        body: apt.client_name + ' · ' + serviceNames + ' · ' + formatDate(apt.appointment_date) + ' às ' + formatTime(apt.start_time),
        url: '/admin',
        tag: 'novo-' + apt.id
      })
    } else {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('kind', 'client')
        .eq('appointment_id', apt.id)
      delivered += await sendTo(subs ?? [], {
        title: 'Lembrete: ' + (shop?.name ?? 'seu horário'),
        body: 'Seu horário é às ' + formatTime(apt.start_time) + ' (' + serviceNames + '). Até já!',
        url: shop?.slug ? '/b/' + shop.slug : '/',
        tag: 'lembrete-' + apt.id
      })
    }
  }

  return new Response(JSON.stringify({ processed, delivered, tz: TZ }), {
    headers: { 'content-type': 'application/json' }
  })
})
