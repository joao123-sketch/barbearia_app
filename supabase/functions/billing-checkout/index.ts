// Edge Function: cria (ou reaproveita) a cobrança Pix da fatura aberta do dono logado e devolve o QR Code.
//
//  * Exige o login do dono (Verify JWT ligado). O dono só enxerga a fatura do próprio negócio.
//  * A chave do Asaas fica só aqui (secrets), nunca no navegador.
//  * Uma fatura aberta tem no máximo uma cobrança ativa: se o valor mudou, a antiga é cancelada antes de criar outra,
//    para ninguém pagar por um valor ou QR que não vale mais.
//  * Sem ASAAS_API_KEY configurada, responde { configured: false } e o app mostra o Pix manual de antes.
//
// Configuração (Edge Functions > Secrets): ASAAS_API_KEY, ASAAS_ENV ("sandbox" ou "production").
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

const asaasBase = () =>
  Deno.env.get('ASAAS_ENV') === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'

class AsaasError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`asaas_${status}`)
  }
}

async function asaas<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(asaasBase() + path, {
    method,
    headers: { access_token: Deno.env.get('ASAAS_API_KEY')!, 'User-Agent': 'SuaAgenda', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 404) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new AsaasError(res.status, data)
  return data as T
}

const errorText = (e: AsaasError) =>
  JSON.stringify((e.body as { errors?: unknown })?.errors ?? e.body ?? '').toLowerCase()

// Avisa o administrador (aparece no painel geral). Nunca derruba o pagamento do dono.
async function alertAdmin(kind: string, message: string, detail: string) {
  try {
    await supabase.rpc('raise_admin_alert', { p_kind: kind, p_message: message, p_detail: detail })
  } catch (e) {
    console.error('alert failed', (e as Error).message)
  }
}

function asaasProblem(e: AsaasError): string {
  const txt = errorText(e)
  if (e.status === 401 || e.status === 403) {
    return 'O Asaas recusou a chave de API. Confira ASAAS_API_KEY e ASAAS_ENV nos segredos do Supabase.'
  }
  if (/chave pix/.test(txt)) {
    return 'A conta do Asaas não tem chave Pix cadastrada, então nenhum dono consegue gerar o Pix. Cadastre uma em Pix > Minhas chaves, no Asaas.'
  }
  return 'O Asaas recusou a criação de uma cobrança. Veja o detalhe técnico.'
}

const todayBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) // AAAA-MM-DD

interface PixQr {
  encodedImage: string
  payload: string
  expirationDate?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!Deno.env.get('ASAAS_API_KEY')) return json({ configured: false })

  // Quem está chamando
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await supabase.auth.getUser(token)
  if (!auth?.user) return json({ error: 'not_authenticated' }, 401)

  const { data: shop } = await supabase
    .from('barbershops')
    .select('id, name, owner_name, owner_email, phone_whatsapp, monthly_fee, next_monthly_fee, asaas_customer_id, subscription_status')
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  if (!shop) return json({ error: 'no_business' }, 404)
  if (shop.subscription_status === 'blocked') return json({ error: 'suspended' }, 403) // suspensão do administrador não se resolve pagando aqui

  let cpfCnpj = ''
  try {
    const body = await req.json()
    cpfCnpj = String(body?.cpf_cnpj ?? '').replace(/\D/g, '')
  } catch {
    // corpo vazio
  }

  try {
    const expected = Number(shop.next_monthly_fee ?? shop.monthly_fee)
    const { data: ensured, error: ensureError } = await supabase.rpc('ensure_open_invoice', { p_shop: shop.id })
    if (ensureError || !ensured?.id) throw new Error(ensureError?.message ?? 'invoice_missing')
    let invoice = ensured as {
      id: string; amount: number; due_date: string; provider_payment_id: string | null
    }

    // Valor mudou (reajuste): cancela a cobrança antiga e passa a valer o novo valor
    if (Number(invoice.amount) !== expected) {
      if (invoice.provider_payment_id) {
        try {
          await asaas('DELETE', `/payments/${invoice.provider_payment_id}`)
        } catch (e) {
          console.error('delete old charge', (e as Error).message)
        }
      }
      await supabase.from('invoices').update({ amount: expected, provider_payment_id: null, pix_payload: null }).eq('id', invoice.id)
      invoice = { ...invoice, amount: expected, provider_payment_id: null }
    }

    // Cliente no Asaas (um por negócio)
    let customerId = shop.asaas_customer_id as string | null
    if (!customerId) {
      const created = await asaas<{ id: string }>('POST', '/customers', {
        name: shop.owner_name || shop.name,
        email: shop.owner_email,
        mobilePhone: shop.phone_whatsapp,
        externalReference: shop.id,
        notificationDisabled: true,
        ...(cpfCnpj ? { cpfCnpj } : {})
      })
      customerId = created!.id
      await supabase.from('barbershops').update({ asaas_customer_id: customerId }).eq('id', shop.id)
    } else if (cpfCnpj) {
      await asaas('POST', `/customers/${customerId}`, { cpfCnpj })
    }

    const createCharge = async (): Promise<string> => {
      const due = invoice.due_date > todayBR() ? invoice.due_date : todayBR()
      const payment = await asaas<{ id: string }>('POST', '/payments', {
        customer: customerId,
        billingType: 'PIX',
        value: expected,
        dueDate: due,
        description: `Mensalidade SuaAgenda - ${shop.name}`,
        externalReference: invoice.id
      })
      // Se outra chamada ao mesmo tempo já criou a cobrança, fica só uma: cancela a sobra
      const { data: claimed } = await supabase
        .from('invoices')
        .update({ provider_payment_id: payment!.id })
        .eq('id', invoice.id)
        .is('provider_payment_id', null)
        .select('id')
      if (!claimed || claimed.length === 0) {
        await asaas('DELETE', `/payments/${payment!.id}`).catch(() => {})
        const { data: current } = await supabase.from('invoices').select('provider_payment_id').eq('id', invoice.id).single()
        return current!.provider_payment_id as string
      }
      return payment!.id
    }

    let chargeId = invoice.provider_payment_id ?? (await createCharge())
    let qr = await asaas<PixQr>('GET', `/payments/${chargeId}/pixQrCode`)

    // Cobrança sumiu ou o QR venceu: cancela e cria uma nova (uma única vez)
    const expired = qr?.expirationDate && new Date(qr.expirationDate.replace(' ', 'T')) < new Date()
    if (!qr || expired) {
      if (qr) await asaas('DELETE', `/payments/${chargeId}`).catch(() => {})
      await supabase.from('invoices').update({ provider_payment_id: null, pix_payload: null }).eq('id', invoice.id)
      chargeId = await createCharge()
      qr = await asaas<PixQr>('GET', `/payments/${chargeId}/pixQrCode`)
      if (!qr) throw new Error('qr_unavailable')
    }

    await supabase.from('invoices').update({ pix_payload: qr.payload }).eq('id', invoice.id)

    return json({
      configured: true,
      invoice: { id: invoice.id, amount: expected, due_date: invoice.due_date },
      pix: { payload: qr.payload, image: qr.encodedImage, expires_at: qr.expirationDate ?? null }
    })
  } catch (err) {
    if (err instanceof AsaasError) {
      console.error('asaas error', err.status, JSON.stringify(err.body))
      // Algumas contas exigem CPF/CNPJ do pagador: o app pede e tenta de novo
      if (/cpf|cnpj/.test(errorText(err))) return json({ configured: true, error: 'cpf_required' }, 422)
      await alertAdmin('asaas_checkout', asaasProblem(err), `HTTP ${err.status}: ${errorText(err)}`)
      return json({ configured: true, error: 'provider_error' }, 502)
    }
    console.error('checkout error', (err as Error).message)
    await alertAdmin('checkout_error', 'O servidor falhou ao gerar um Pix. Veja os logs da função billing-checkout.', (err as Error).message)
    return json({ configured: true, error: 'checkout_error' }, 500)
  }
})
