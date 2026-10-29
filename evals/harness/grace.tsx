// Página de avaliação: monta os componentes REAIS (GraceSetting, tela de bloqueio) com um servidor falso no lugar do
// Supabase. Só é usada por evals/grace.eval.mjs; não entra no build do produto (o Vite só empacota index.html).
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '/src/index.css'
import { supabase } from '/src/lib/supabase'
import { addDays, todayBR } from '/src/lib/billing'
import { DEFAULT_PLATFORM_SETTINGS } from '/src/lib/platform'
import { GraceSetting } from '/src/components/GraceSetting'
import { BillingLockedScreen } from '/src/components/BillingNotices'
import type { Barbershop } from '/src/types'

const w = window as unknown as Record<string, any>
w.__calls = [] as unknown[]
w.__mode = 'admin' // admin | owner (o banco recusa em silêncio) | check (violou a regra de 0 a 60)
w.__serverGrace = 10
w.__confirms = [] as string[]
w.__confirmAnswer = true
window.confirm = (message?: string) => {
  w.__confirms.push(String(message))
  return Boolean(w.__confirmAnswer)
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Servidor falso: responde como o banco responderia, e anota o que a tela mandou
;(supabase as any).from = (table: string) => {
  const q: any = { table }
  for (const method of ['eq', 'order', 'limit']) q[method] = () => q
  q.update = (payload: any) => ((q.op = 'update'), (q.payload = payload), q)
  q.select = () => (q.op ? q : ((q.op = 'select'), q))
  q.maybeSingle = () => resolve(q)
  q.then = (ok: any, fail: any) => resolve(q).then(ok, fail)
  return q
}
async function resolve(q: any) {
  if (q.op === 'update') {
    await wait(150)
    w.__calls.push({ table: q.table, payload: q.payload })
    if (w.__mode === 'owner') return { data: [], error: null }
    if (w.__mode === 'check') {
      return { data: null, error: { message: 'new row for relation "platform_settings" violates check constraint "platform_settings_grace_days_check"' } }
    }
    w.__serverGrace = q.payload.grace_days
    return { data: [{ grace_days: q.payload.grace_days }], error: null }
  }
  if (q.table === 'platform_settings') {
    return {
      data: { monthly_fee: 49.9, pix_key: '', pix_name: '', pix_bank: '', pix_qrcode: '', contact_whatsapp: '', grace_days: w.__serverGrace, invoice_lead_days: 7, reminder_offsets: [-5, 0] },
      error: null
    }
  }
  return { data: [], error: null } // invoices etc.
}
Object.defineProperty(supabase, 'functions', { value: { invoke: async () => ({ data: { configured: false }, error: null }) } })

const today = todayBR()
const shop = (slug: string, overdue: number, status: Barbershop['subscription_status'] = 'active'): Barbershop => ({
  id: slug, name: `Loja ${slug}`, slug, phone_whatsapp: '88999999999', address: '', monthly_fee: 49.9,
  subscription_status: status, next_billing_date: addDays(today, -overdue)
})
// em dia, 2, 5, 9, 12 e 20 dias de atraso
const shops = [shop('a', 0), shop('b', 2), shop('c', 5), shop('d', 9), shop('e', 12), shop('f', 20)]

const screen = new URLSearchParams(location.search).get('screen') ?? 'grace'

// Imita o /master: o estado das configurações é atualizado de forma funcional, como em MasterAdminDashboard
const GraceScreen = () => {
  const [settings, setSettings] = useState({ grace_days: 10, pix_key: 'PIX-A' })
  w.__setPix = (v: string) => setSettings((prev) => ({ ...prev, pix_key: v }))
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-3">
      <GraceSetting graceDays={settings.grace_days} barbershops={shops} onSaved={(days) => setSettings((prev) => ({ ...prev, grace_days: days }))} />
      <p className="text-xs text-slate-400">
        grace no pai: <output id="parent-grace">{settings.grace_days}</output> · pix no pai: <output id="parent-pix">{settings.pix_key}</output>
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  screen === 'locked' ? (
    <BillingLockedScreen barbershop={shop('bloqueada', 20)} platform={DEFAULT_PLATFORM_SETTINGS} onPaid={() => {}} onLogout={() => {}} />
  ) : (
    <GraceScreen />
  )
)
