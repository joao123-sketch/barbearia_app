// Aviso de novo cadastro para o administrador: só ele recebe, só cadastro novo gera aviso. Migrações reais (PGlite).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, asUser, one, rows, ADMIN, OWNER } from '../helpers/db.mjs'

let db
let baseline = 0
const NEW_OWNER = '55555555-5555-5555-5555-555555555555'
const NEW_SHOP = '66666666-6666-6666-6666-666666666666'
const ADMIN_SHOP = '77777777-7777-7777-7777-777777777777'

before(async () => {
  db = await createDb()
  await db.exec(`insert into auth.users (id, email) values ('${NEW_OWNER}', 'novo@teste.com')`)
  baseline = (await rows(db, "select 1 from public.notification_queue where kind = 'admin_signup'")).length // o negócio de exemplo do banco de teste
})
after(async () => {
  await db.close()
})

const queued = (kind) => rows(db, `select * from public.notification_queue where kind = '${kind}' order by id`)

test('negócio novo gera um aviso para o administrador, com nome, tipo, cidade e WhatsApp', async () => {
  await db.exec(`
    insert into public.barbershops (id, owner_id, business_type, name, slug, owner_email, phone_whatsapp, city, state, monthly_fee, subscription_status, next_billing_date)
    values ('${NEW_SHOP}', '${NEW_OWNER}', 'salao', 'Studio Bela Vida', 'studio-bela-vida', 'novo@teste.com', '88977776666', 'Sobral', 'CE', 49.90, 'trial', public.today_br() + 20)
  `)
  const list = await queued('admin_signup')
  assert.equal(list.length, baseline + 1)
  const mine = list.find((i) => i.barbershop_id === NEW_SHOP)
  assert.equal(mine.title, 'Novo cadastro')
  assert.equal(mine.body, 'Studio Bela Vida (Salão) · Sobral/CE · WhatsApp 88977776666')
  assert.equal(mine.sent_at, null)
})

test('editar o negócio não gera outro aviso, e a conta do próprio administrador não avisa', async () => {
  await db.exec(`update public.barbershops set slogan = 'Novo slogan' where id = '${NEW_SHOP}'`)
  await db.exec(`
    insert into public.barbershops (id, owner_id, business_type, name, slug, owner_email, phone_whatsapp, monthly_fee, subscription_status, next_billing_date)
    values ('${ADMIN_SHOP}', '${ADMIN}', 'barbearia', 'Loja do Admin', 'loja-do-admin', 'admin@teste.com', '88988888888', 49.90, 'active', public.today_br())
  `)
  assert.equal((await queued('admin_signup')).length, baseline + 1)
})

test('só o administrador cadastra o aparelho dele; dono comum não consegue', async () => {
  const endpoint = 'https://push.example/admin-1'
  await asUser(db, ADMIN, () =>
    db.query("insert into public.push_subscriptions (kind, user_id, endpoint, p256dh, auth) values ('admin', $1, $2, 'k', 'a')", [ADMIN, endpoint])
  )
  assert.equal((await rows(db, "select 1 from public.push_subscriptions where kind = 'admin'")).length, 1)
  await assert.rejects(
    asUser(db, OWNER, () =>
      db.query("insert into public.push_subscriptions (kind, user_id, endpoint, p256dh, auth) values ('admin', $1, 'https://push.example/x', 'k', 'a')", [OWNER])
    )
  )
  // o dono comum também não enxerga aparelhos do administrador
  const seen = await asUser(db, OWNER, async () => (await db.query("select count(*)::int as n from public.push_subscriptions where kind = 'admin'")).rows[0].n)
  assert.equal(seen, 0)
})

test('o administrador não consegue cadastrar aparelho em nome de outro usuário', async () => {
  await assert.rejects(
    asUser(db, ADMIN, () =>
      db.query("insert into public.push_subscriptions (kind, user_id, endpoint, p256dh, auth) values ('admin', $1, 'https://push.example/y', 'k', 'a')", [OWNER])
    )
  )
})

test('o aviso de teste só vale para o administrador', async () => {
  await assert.rejects(asUser(db, OWNER, () => db.query('select public.send_admin_test_push()')), /forbidden/)
  await asUser(db, ADMIN, () => db.query('select public.send_admin_test_push()'))
  assert.equal((await queued('admin_test')).length, 1)
})

test('os avisos de agendamento do dono continuam como eram (aparelhos de dono e de cliente não mudam)', async () => {
  const kinds = await rows(db, "select conname from pg_constraint where conrelid = 'public.push_subscriptions'::regclass and contype = 'c' order by conname")
  assert.ok(kinds.some((k) => k.conname === 'push_subscriptions_target_check'))
  await db.exec(`insert into public.push_subscriptions (kind, barbershop_id, endpoint, p256dh, auth) values ('owner', '${NEW_SHOP}', 'https://push.example/o', 'k', 'a')`)
  await assert.rejects(db.query("insert into public.push_subscriptions (kind, endpoint, p256dh, auth) values ('owner', 'https://push.example/z', 'k', 'a')"))
  assert.equal((await one(db, "select count(*)::int as n from public.push_subscriptions where kind = 'owner'")).n, 1)
})
