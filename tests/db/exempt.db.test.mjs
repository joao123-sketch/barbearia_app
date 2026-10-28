// Conta administradora não paga: nunca bloqueia, não gera fatura nem lembrete. Roda nas migrações reais (PGlite).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, one, rows, ADMIN, OWNER, SHOP } from '../helpers/db.mjs'
import { getBillingState } from '../../src/lib/billing.ts'

let db
const ADMIN_SHOP = '44444444-4444-4444-4444-444444444444'

before(async () => {
  db = await createDb()
  // negócio do administrador, já vencido há 90 dias e suspenso: a regra tem que vencer isso
  await db.exec(`
    insert into public.barbershops (id, owner_id, business_type, name, slug, owner_email, phone_whatsapp, monthly_fee, subscription_status, next_billing_date)
    values ('${ADMIN_SHOP}', '${ADMIN}', 'barbearia', 'Loja do Admin', 'loja-admin', 'admin@teste.com', '88988888888', 49.90, 'blocked', public.today_br() - 90);
  `)
})
after(async () => {
  await db.close()
})

const shop = (id) => one(db, `select * from public.barbershops where id = '${id}'`)

test('negócio de administrador nasce isento, ativo e sem vencimento próximo', async () => {
  const s = await shop(ADMIN_SHOP)
  assert.equal(s.billing_exempt, true)
  assert.equal(s.subscription_status, 'active')
  assert.equal(String(s.next_billing_date.toISOString?.().slice(0, 10) ?? s.next_billing_date).slice(0, 10), '2099-12-31')
  assert.equal((await one(db, `select public.shop_locked('${s.subscription_status}', '2099-12-31') as v`)).v, false)
})

test('negócio de dono comum continua cobrado', async () => {
  const s = await shop(SHOP)
  assert.equal(s.billing_exempt, false)
  assert.equal(s.subscription_status, 'active')
})

test('tentar suspender ou vencer a conta do administrador não vale', async () => {
  await db.exec(`update public.barbershops set subscription_status = 'blocked', next_billing_date = public.today_br() - 400 where id = '${ADMIN_SHOP}'`)
  const s = await shop(ADMIN_SHOP)
  assert.equal(s.subscription_status, 'active')
  assert.equal(String(s.next_billing_date.toISOString?.().slice(0, 10) ?? s.next_billing_date).slice(0, 10), '2099-12-31')
})

test('a rotina diária não gera fatura nem lembrete para a conta isenta, e continua cobrando as outras', async () => {
  await db.exec(`update public.barbershops set next_billing_date = public.today_br() - 12 where id = '${SHOP}'`)
  await db.exec('select public.billing_daily()')
  assert.equal((await rows(db, `select 1 from public.invoices where barbershop_id = '${ADMIN_SHOP}'`)).length, 0)
  assert.equal((await rows(db, `select 1 from public.notification_queue where barbershop_id = '${ADMIN_SHOP}' and kind = 'billing_reminder'`)).length, 0)
  assert.equal((await rows(db, `select 1 from public.invoices where barbershop_id = '${SHOP}'`)).length, 1)
})

test('quem vira administrador depois passa a ser isento; quem deixa de ser volta a ser cobrado', async () => {
  await db.exec(`insert into public.platform_admins (user_id) values ('${OWNER}')`)
  assert.equal((await shop(SHOP)).billing_exempt, true)
  assert.equal((await shop(SHOP)).subscription_status, 'active')
  await db.exec(`delete from public.platform_admins where user_id = '${OWNER}'`)
  assert.equal((await shop(SHOP)).billing_exempt, false)
})

test('a tela concorda: conta isenta nunca aparece como vencida ou bloqueada', () => {
  const exempt = { billing_exempt: true, subscription_status: 'blocked', next_billing_date: '2020-01-01' }
  const state = getBillingState(exempt, 0)
  assert.equal(state.status, 'active')
  assert.equal(state.overdueDays, 0)
  assert.equal(getBillingState({ ...exempt, billing_exempt: false }, 0).status, 'blocked')
})
