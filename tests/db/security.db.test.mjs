// Endurecimento de segurança (migração 0019), com os privilégios padrão do Supabase reproduzidos no banco de teste.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, asUser, one, SHOP, OWNER } from '../helpers/db.mjs'

let db
before(async () => {
  db = await createDb()
})
after(async () => {
  await db.close()
})

const asAnon = async (fn) => {
  await db.exec('set role anon;')
  try {
    return await fn()
  } finally {
    await db.exec('reset role;')
  }
}

test('anônimo lê a view pública, mas não consegue alterar nem apagar negócios por ela', async () => {
  const rows = await asAnon(() => db.query('select id, name from public.public_barbershops'))
  assert.ok(rows.rows.length >= 1)
  await assert.rejects(asAnon(() => db.query(`update public.public_barbershops set name = 'invadido' where id = '${SHOP}'`)), /permission denied/)
  await assert.rejects(asAnon(() => db.query(`delete from public.public_barbershops where id = '${SHOP}'`)), /permission denied/)
  await assert.rejects(asAnon(() => db.query(`update public.public_barbershops set phone_whatsapp = '88900000000' where id = '${SHOP}'`)), /permission denied/)
  assert.equal((await one(db, `select name from public.barbershops where id = '${SHOP}'`)).name, 'Loja Teste')
})

test('dono logado também não escreve pela view (só pela tabela, com as regras dele)', async () => {
  await assert.rejects(
    asUser(db, OWNER, () => db.query(`update public.public_barbershops set name = 'x' where id = '${SHOP}'`)),
    /permission denied/
  )
})

test('tabela nova criada depois não nasce com escrita liberada para anônimo', async () => {
  await db.exec('create table public.tabela_nova_teste (id int)')
  const priv = await one(db, "select has_table_privilege('anon', 'public.tabela_nova_teste', 'insert') as ins, has_table_privilege('anon', 'public.tabela_nova_teste', 'select') as sel")
  assert.equal(priv.ins, false)
  assert.equal(priv.sel, true) // leitura continua como padrão do Supabase; a proteção dela é o RLS
})

test('endereço de push precisa ser https com domínio (sem IP nem http)', async () => {
  const ok = "https://fcm.googleapis.com/fcm/send/abc"
  const insert = (endpoint) => db.exec(`insert into public.push_subscriptions (kind, barbershop_id, endpoint, p256dh, auth) values ('owner', '${SHOP}', '${endpoint}', 'k', 'a')`)
  await insert(ok)
  for (const bad of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://10.0.0.5/hook', 'https://localhost/x', 'ftp://exemplo.com/x']) {
    await assert.rejects(insert(bad), /endpoint_https/, bad)
  }
})

test('endereço de push só aceita os serviços reais (Google, Mozilla, Apple, Microsoft)', async () => {
  const insert = (endpoint) => db.exec(`insert into public.push_subscriptions (kind, barbershop_id, endpoint, p256dh, auth) values ('owner', '${SHOP}', '${endpoint}', 'k', 'a')`)
  for (const ok of [
    'https://web.push.apple.com/QOk1',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://wns2-pn1p.notify.windows.com/w/?token=abc',
    'https://fcm.googleapis.com/fcm/send/xyz'
  ]) await insert(ok)
  for (const bad of [
    'https://exemplo.com/hook',
    'https://fcm.googleapis.com.evil.com/x',
    'https://evil.com/fcm.googleapis.com/x',
    'https://push.apple.com.atacante.net/x',
    'https://internal.service.local/x'
  ]) await assert.rejects(insert(bad), /endpoint_https/, bad)
})

test('contas de demonstração: o dono do negócio não consegue marcar a própria conta', async () => {
  const col = await one(db, "select has_column_privilege('authenticated', 'public.barbershops', 'is_demo', 'update') as upd")
  assert.equal(col.upd, false)
})
