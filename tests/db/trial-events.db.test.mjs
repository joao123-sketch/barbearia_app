// Teste grátis por WhatsApp ou e-mail (0016) e contagem do funil de cadastro (0017). Migrações reais (PGlite).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, asUser, one, rows, ADMIN, OWNER } from '../helpers/db.mjs'

let db
const U1 = '81111111-1111-1111-1111-111111111111'
const U2 = '82222222-2222-2222-2222-222222222222'
const U3 = '83333333-3333-3333-3333-333333333333'

before(async () => {
  db = await createDb()
  await db.exec(`insert into auth.users (id, email) values
    ('${U1}', 'Primeira@Teste.com'), ('${U2}', 'segunda@teste.com'), ('${U3}', 'terceira@teste.com')`)
})
after(async () => {
  await db.close()
})

const payload = (name, phone) => JSON.stringify({ business_type: 'barbearia', name, slug: name.toLowerCase().replace(/ /g, '-'), owner_name: 'Dono', phone_whatsapp: phone })
const register = (user, name, phone) =>
  asUser(db, user, () => db.query(`select public.register_barbershop('${payload(name, phone)}'::jsonb, '{}') as id`))
const statusOf = (name) => one(db, `select subscription_status as s from public.barbershops where name = '${name}'`)

test('primeiro cadastro ganha o teste grátis e entra no histórico com WhatsApp e e-mail', async () => {
  await register(U1, 'Loja Um', '88911110001')
  assert.equal((await statusOf('Loja Um')).s, 'trial')
  const h = await one(db, "select email from public.trial_history where phone = '88911110001'")
  assert.equal(h.email, 'primeira@teste.com')
})

test('mesmo WhatsApp com e-mail novo: conta criada, sem teste grátis', async () => {
  await db.exec(`delete from public.barbershops where name = 'Loja Um'`)
  await register(U2, 'Loja Dois', '88911110001')
  assert.equal((await statusOf('Loja Dois')).s, 'pending')
})

test('mesmo e-mail com WhatsApp novo: conta criada, sem teste grátis', async () => {
  await db.exec(`update auth.users set email = 'primeira@teste.com' where id = '${U3}'`)
  await register(U3, 'Loja Tres', '88911110003')
  assert.equal((await statusOf('Loja Tres')).s, 'pending')
})

test('trial_used reconhece WhatsApp e e-mail, e nega os desconhecidos', async () => {
  assert.equal((await one(db, "select public.trial_used('(88) 91111-0001') as r")).r, true)
  assert.equal((await one(db, "select public.trial_used(null, ' PRIMEIRA@teste.com ') as r")).r, true)
  assert.equal((await one(db, "select public.trial_used('88911119999', 'novo@teste.com') as r")).r, false)
})

test('track_event só aceita os eventos conhecidos', async () => {
  await db.exec("select public.track_event('login_visit'); select public.track_event('signup_open'); select public.track_event('invasor')")
  const list = await rows(db, 'select event from public.page_events order by id')
  assert.deepEqual(list.map((r) => r.event), ['login_visit', 'signup_open'])
})

test('contagens do funil: só o administrador lê', async () => {
  const counts = await asUser(db, ADMIN, () => db.query('select * from public.admin_event_counts()'))
  const visit = counts.rows.find((r) => r.event === 'login_visit')
  assert.equal(visit.total, 1)
  assert.equal(visit.today, 1)
  await assert.rejects(asUser(db, OWNER, () => db.query('select * from public.admin_event_counts()')), /forbidden/)
})
