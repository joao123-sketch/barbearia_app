// Carência antes do bloqueio, no banco: o valor que o administrador define no /master tem que valer de verdade.
// Faixa "db" (sobe um Postgres local com as migrações reais), por isso fica fora do gate rápido.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, asUser, one, rows, ADMIN, OWNER, SHOP } from '../helpers/db.mjs'
import { getBillingState, addDays, withoutGrace } from '../../src/lib/billing.ts'

let db
before(async () => {
  db = await createDb()
})
after(async () => {
  await db.close()
})

// O que o botão "Salvar carência" do painel manda para o banco
const setGrace = (days) => db.query('update public.platform_settings set grace_days = $1, updated_at = now() where id = 1', [days])
const locked = async (status, overdueDays) =>
  (await one(db, `select public.shop_locked('${status}', public.today_br() - ${overdueDays}) as v`)).v

test('o padrão do banco é 10 dias (bloqueia no 11º)', async () => {
  assert.equal((await one(db, 'select grace_days from public.platform_settings where id = 1')).grace_days, 10)
  assert.equal(await locked('active', 10), false)
  assert.equal(await locked('active', 11), true)
})

for (const grace of [0, 3, 10, 30, 60]) {
  test(`com carência ${grace}: ${grace} dias de atraso ainda passam, ${grace + 1} bloqueiam`, async () => {
    await setGrace(grace)
    assert.equal(await locked('active', grace), false)
    assert.equal(await locked('active', grace + 1), true)
    assert.equal(await locked('active', 0), false, 'vencendo hoje nunca bloqueia')
  })
}

test('o administrador altera pelo mesmo caminho do painel; o dono comum não consegue', async () => {
  await setGrace(10)
  const asAdmin = await asUser(db, ADMIN, () =>
    db.query('update public.platform_settings set grace_days = 5, updated_at = now() where id = 1')
  )
  assert.equal(asAdmin.affectedRows, 1)
  assert.equal((await one(db, 'select grace_days from public.platform_settings where id = 1')).grace_days, 5)

  const asOwner = await asUser(db, OWNER, () =>
    db.query('update public.platform_settings set grace_days = 60, updated_at = now() where id = 1')
  )
  assert.equal(asOwner.affectedRows, 0, 'RLS impede o dono comum')
  assert.equal((await one(db, 'select grace_days from public.platform_settings where id = 1')).grace_days, 5)
})

test('o banco recusa valores fora de 0 a 60', async () => {
  await setGrace(10)
  for (const bad of [-1, 61, 1000]) {
    await assert.rejects(
      asUser(db, ADMIN, () => db.query('update public.platform_settings set grace_days = $1 where id = 1', [bad])),
      /check/i
    )
  }
  assert.equal((await one(db, 'select grace_days from public.platform_settings where id = 1')).grace_days, 10)
})

test('trocar a carência muda o link público e os dados do painel na hora', async () => {
  await setGrace(10)
  await db.exec(`update public.barbershops set next_billing_date = public.today_br() - 5 where id = '${SHOP}'`)
  const publicActive = async () => (await one(db, `select service_active from public.public_barbershops where id = '${SHOP}'`)).service_active
  const ownerSeesServices = async () =>
    (await asUser(db, OWNER, () => rows(db, `select id from public.services where barbershop_id = '${SHOP}'`))).length

  assert.equal(await publicActive(), true, '5 dias de atraso com carência 10')
  assert.equal(await ownerSeesServices(), 1)

  await setGrace(3)
  assert.equal(await publicActive(), false, 'carência 3: o link sai do ar')
  assert.equal(await ownerSeesServices(), 0, 'carência 3: o painel fica bloqueado por RLS')

  await setGrace(30)
  assert.equal(await publicActive(), true, 'aumentar a carência libera de novo, sem mexer na conta')
  assert.equal(await ownerSeesServices(), 1)
  await db.exec(`update public.barbershops set next_billing_date = public.today_br() where id = '${SHOP}'`)
})

test('tela e banco concordam em todos os status, com o instante do próprio banco, em qualquer fuso do aparelho', async () => {
  const original = process.env.TZ
  try {
    // um único instante: o "agora" do banco e o dia de Brasília que ele calcula
    const { t, d } = await one(db, 'select now() as t, public.today_br()::text as d')
    for (const tz of ['UTC', 'Asia/Tokyo', 'America/Rio_Branco', 'America/Sao_Paulo']) {
      process.env.TZ = tz
      for (const grace of [0, 3, 10, 30, 60]) {
        await setGrace(grace)
        for (const status of ['active', 'trial', 'pending', 'blocked']) {
          for (let overdue = -3; overdue <= 65; overdue++) {
            const due = addDays(d, -overdue)
            const sql = (await one(db, `select public.shop_locked('${status}', '${due}'::date) as v`)).v
            const ui = getBillingState({ next_billing_date: due, subscription_status: status }, grace, new Date(t)).status === 'blocked'
            assert.equal(ui, sql, `${tz} carência ${grace} ${status} ${overdue} dias: tela=${ui} banco=${sql}`)
          }
        }
      }
    }
  } finally {
    process.env.TZ = original
    await setGrace(10)
  }
})

test('o formulário de PIX não desfaz a carência: o payload dele não leva grace_days', async () => {
  await setGrace(3)
  // o /master estava aberto com a carência antiga (10) quando outro administrador salvou 3
  const staleSettings = { monthly_fee: 59.9, pix_name: 'Titular Novo', grace_days: 10 }
  const sent = withoutGrace(staleSettings)
  const columns = Object.keys(sent)
  const sets = columns.map((c, i) => `${c} = $${i + 1}`).join(', ')
  await db.query(`update public.platform_settings set ${sets} where id = 1`, columns.map((c) => sent[c]))
  const row = await one(db, 'select grace_days, monthly_fee::text as fee, pix_name from public.platform_settings where id = 1')
  assert.equal(row.grace_days, 3, 'a carência continua a que o outro administrador salvou')
  assert.equal(row.fee, '59.90')
  assert.equal(row.pix_name, 'Titular Novo')
  await setGrace(10)
})

test('sem o primeiro pagamento e suspensão manual bloqueiam, qualquer que seja a carência', async () => {
  await setGrace(60)
  assert.equal(await locked('pending', 1), true)
  assert.equal(await locked('blocked', -20), true)
})
