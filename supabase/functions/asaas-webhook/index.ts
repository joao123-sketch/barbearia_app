// Edge Function: recebe os avisos do Asaas e quita as mensalidades automaticamente.
//
// Segurança:
//  * Só aceita chamadas com o token secreto no cabeçalho "asaas-access-token" (ASAAS_WEBHOOK_TOKEN).
//  * Nunca confia só no conteúdo do aviso: antes de quitar, consulta o pagamento direto na API do Asaas e confere
//    status, valor e a fatura de origem.
//  * Idempotente: cada evento (id do Asaas) é gravado uma vez; reenvios não somam dois períodos. Um evento que
//    falhou no meio do caminho fica "sem resultado" e é reprocessado quando o Asaas reenviar.
//  * Responde 200 só depois de gravar o resultado; erros de infraestrutura devolvem 500 para o Asaas tentar de novo.
//
// Configuração (Edge Functions > Secrets): ASAAS_API_KEY, ASAAS_ENV ("sandbox" ou "production"), ASAAS_WEBHOOK_TOKEN.
// Esta função precisa ficar com "Verify JWT" DESLIGADO (quem chama é o Asaas, não um usuário do app).
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const asaasBase = () =>
  Deno.env.get('ASAAS_ENV') === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'

// Comparação em tempo constante (evita descobrir o token pelo tempo de resposta)
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

// Resultados que pedem conferência do administrador (aparecem como alerta no painel geral)
const NEEDS_REVIEW = new Set(['duplicate', 'amount_mismatch', 'cancelled_invoice', 'unmatched', 'verification_failed', 'flagged_refund'])

async function alertAdmin(kind: string, message: string, detail: string) {
  try {
    await supabase.rpc('raise_admin_alert', { p_kind: kind, p_message: message, p_detail: detail })
  } catch (e) {
    console.error('alert failed', (e as Error).message)
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

interface AsaasPayment {
  id: string
  status?: string
  value?: number
  billingType?: string
  externalReference?: string | null
  paymentDate?: string | null
  confirmedDate?: string | null
}

// Fonte da verdade: o pagamento como o Asaas o conhece agora
async function fetchPayment(id: string): Promise<AsaasPayment | null> {
  const res = await fetch(`${asaasBase()}/payments/${encodeURIComponent(id)}`, {
    headers: { access_token: Deno.env.get('ASAAS_API_KEY')!, 'User-Agent': 'SuaAgenda', 'content-type': 'application/json' }
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`asaas_${res.status}`)
  return await res.json()
}

const PAID_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])

// Devolve o resultado gravado no evento
async function handle(event: string, payment: AsaasPayment): Promise<{ result: string; invoiceId?: string }> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, amount, status')
    .eq('provider', 'asaas')
    .eq('provider_payment_id', payment.id)
    .maybeSingle()

  if (!invoice) return { result: 'unmatched' } // cobrança que não é de nenhuma fatura nossa: fica registrada para conferência

  if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_PARTIALLY_REFUNDED' || event === 'PAYMENT_CHARGEBACK_REQUESTED') {
    await supabase
      .from('invoices')
      .update({ flag: 'refunded', flag_note: `Aviso do Asaas: ${event}. Confira se o acesso deve continuar.` })
      .eq('id', invoice.id)
    return { result: 'flagged_refund', invoiceId: invoice.id }
  }

  // Pix confirma em PAYMENT_RECEIVED; cartão confirma antes do dinheiro cair, em PAYMENT_CONFIRMED
  const isPaidEvent =
    event === 'PAYMENT_RECEIVED' || (event === 'PAYMENT_CONFIRMED' && payment.billingType === 'CREDIT_CARD')
  if (!isPaidEvent) return { result: 'ignored', invoiceId: invoice.id }

  // Confere no Asaas (não confia só no corpo recebido)
  const remote = await fetchPayment(payment.id)
  if (!remote || !PAID_STATUSES.has(remote.status ?? '')) return { result: 'verification_failed', invoiceId: invoice.id }
  if (remote.externalReference && remote.externalReference !== invoice.id) {
    return { result: 'verification_failed', invoiceId: invoice.id }
  }

  const paidAt = remote.confirmedDate ?? remote.paymentDate
  const { data: applied, error } = await supabase.rpc('apply_invoice_payment', {
    p_invoice: invoice.id,
    p_amount: remote.value ?? null,
    p_paid_at: paidAt ? new Date(paidAt + 'T12:00:00-03:00').toISOString() : new Date().toISOString(),
    p_source: 'provider',
    p_provider_payment: payment.id
  })
  if (error) throw new Error(error.message)
  return { result: String(applied), invoiceId: invoice.id }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? ''
  const received = req.headers.get('asaas-access-token') ?? ''
  if (!expected || !safeEqual(received, expected)) return json({ error: 'unauthorized' }, 401)

  let body: { id?: string; event?: string; payment?: AsaasPayment }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  if (!body.id || !body.event) return json({ error: 'invalid_event' }, 400)

  // Registra o evento uma única vez; se já existe e já foi processado, é reenvio
  const { error: insertError } = await supabase.from('payment_events').insert({
    provider: 'asaas',
    event_id: body.id,
    event_type: body.event,
    provider_payment_id: body.payment?.id ?? null,
    payload: body
  })
  if (insertError && insertError.code !== '23505') {
    console.error('payment_events insert', insertError.message)
    return json({ error: 'storage_error' }, 500)
  }
  if (insertError) {
    const { data: existing } = await supabase
      .from('payment_events')
      .select('result')
      .eq('provider', 'asaas')
      .eq('event_id', body.id)
      .maybeSingle()
    if (existing?.result) return json({ ok: true, duplicate: true })
  }

  if (!body.payment?.id) {
    await supabase.from('payment_events').update({ result: 'ignored' }).eq('provider', 'asaas').eq('event_id', body.id)
    return json({ ok: true })
  }

  try {
    const { result, invoiceId } = await handle(body.event, body.payment)
    await supabase
      .from('payment_events')
      .update({ result, invoice_id: invoiceId ?? null })
      .eq('provider', 'asaas')
      .eq('event_id', body.id)
    // Cobrança desconhecida só preocupa quando é dinheiro recebido (o Asaas também avisa de cobranças criadas à mão)
    const moneyIn = /RECEIVED|CONFIRMED/.test(body.event)
    if (NEEDS_REVIEW.has(result) && (result !== 'unmatched' || moneyIn)) {
      await alertAdmin('payment_review', 'Há um pagamento do Asaas que precisa de conferência. Abra "Pagamentos e faturas".', `${body.event} · ${result} · ${body.payment.id}`)
    }
    return json({ ok: true, result })
  } catch (err) {
    // Sem resultado gravado: o Asaas reenvia e tentamos de novo
    console.error('webhook error', (err as Error).message)
    await alertAdmin('asaas_webhook', 'Falha ao processar um aviso de pagamento do Asaas. O Asaas vai reenviar; se persistir, veja os logs de asaas-webhook.', (err as Error).message)
    return json({ error: 'processing_error' }, 500)
  }
})
