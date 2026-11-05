// Tipo de negócio "lava-jato" (migração 0018): aceito no cadastro, aviso ao administrador e tipos inválidos recusados.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, asUser, one, rows } from '../helpers/db.mjs'

let db
const U = '91111111-1111-1111-1111-111111111111'

before(async () => {
  db = await createDb()
  await db.exec(`insert into auth.users (id, email) values ('${U}', 'lava@teste.com')`)
})
after(async () => {
  await db.close()
})

const payload = (type) =>
  JSON.stringify({ business_type: type, name: 'Lava Brilho', slug: 'lava-brilho', owner_name: 'Dono', phone_whatsapp: '88955550001' })

test('cadastro como lava-jato é aceito e começa com o teste grátis', async () => {
  await asUser(db, U, () => db.query(`select public.register_barbershop('${payload('lavajato')}'::jsonb, '{}')`))
  const shop = await one(db, "select business_type, subscription_status from public.barbershops where slug = 'lava-brilho'")
  assert.equal(shop.business_type, 'lavajato')
  assert.equal(shop.subscription_status, 'trial')
})

test('o aviso ao administrador diz "Lava-jato"', async () => {
  const list = await rows(db, "select body from public.notification_queue where kind = 'admin_signup' and body like 'Lava Brilho%'")
  assert.equal(list.length, 1)
  assert.match(list[0].body, /^Lava Brilho \(Lava-jato\)/)
})

test('tipo desconhecido continua recusado pelo banco', async () => {
  await db.exec(`insert into auth.users (id, email) values ('92222222-2222-2222-2222-222222222222', 'x@teste.com')`)
  await assert.rejects(
    asUser(db, '92222222-2222-2222-2222-222222222222', () =>
      db.query(`select public.register_barbershop('${payload('dentista').replace('88955550001', '88955550002').replace('lava-brilho', 'outro')}'::jsonb, '{}')`)
    ),
    /business_type_check/
  )
})
