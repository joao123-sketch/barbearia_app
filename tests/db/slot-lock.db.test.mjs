// Trava de horário (migração 0020): dois agendamentos ativos não se sobrepõem, por qualquer caminho de gravação.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, asUser, one, rows, OWNER, SHOP } from '../helpers/db.mjs'

let db
let barberA
let barberB
let service
const DAY = '2030-06-10' // uma segunda-feira no futuro

before(async () => {
  db = await createDb()
  await db.exec(`
    insert into public.working_hours (barbershop_id, day_of_week, day_name, is_open, open_time, close_time)
    select '${SHOP}', d, 'dia', true, '08:00', '20:00' from generate_series(0, 6) d`)
  barberA = (await one(db, `insert into public.barbers (barbershop_id, name) values ('${SHOP}', 'Ana') returning id`)).id
  barberB = (await one(db, `insert into public.barbers (barbershop_id, name) values ('${SHOP}', 'Beto') returning id`)).id
  service = (await one(db, `select id from public.services where barbershop_id = '${SHOP}' limit 1`)).id // Corte, 30 min
})
after(async () => {
  await db.close()
})

const book = (barber, start, dur = 30, status = 'confirmed') =>
  db.query(
    `insert into public.appointments (barbershop_id, barber_id, service_ids, client_name, client_phone, appointment_date, start_time, total_price, total_duration, status)
     values ('${SHOP}', ${barber ? `'${barber}'` : 'null'}, array['${service}']::uuid[], 'Cliente', '88911112222', '${DAY}', '${start}', 40, ${dur}, '${status}') returning id`
  )

test('o mesmo horário do mesmo profissional é recusado com slot_taken', async () => {
  await book(barberA, '09:00')
  await assert.rejects(book(barberA, '09:00'), /slot_taken/)
})

test('horário que sobrepõe só em parte também é recusado', async () => {
  await book(barberA, '10:00', 60) // 10:00 às 11:00
  await assert.rejects(book(barberA, '10:30'), /slot_taken/)
  await assert.rejects(book(barberA, '09:45', 30), /slot_taken/) // 09:45–10:15 bate com 10:00
})

test('horários encostados, profissionais diferentes e cancelados não conflitam', async () => {
  await book(barberA, '11:00') // encosta no fim do de 10:00–11:00
  await book(barberB, '09:00') // outro profissional, mesmo horário
  await book(barberA, '12:00', 30, 'cancelled')
  await book(barberA, '12:00') // o cancelado não segura o horário
})

test('sem profissional escolhido, a trava vale entre os agendamentos sem profissional', async () => {
  await book(null, '14:00')
  await assert.rejects(book(null, '14:00'), /slot_taken/)
})

test('o dono lançando no balcão pelo painel também respeita a trava', async () => {
  await assert.rejects(
    asUser(db, OWNER, () => book(barberA, '09:00')),
    /slot_taken/
  )
})

test('reativar um cancelado num horário já ocupado é recusado; editar o próprio horário não conflita consigo mesmo', async () => {
  const cancelled = (await book(barberA, '16:00', 30, 'cancelled')).rows[0].id
  await book(barberA, '16:00')
  await assert.rejects(db.query(`update public.appointments set status = 'confirmed' where id = '${cancelled}'`), /slot_taken/)

  const own = (await book(barberB, '17:00')).rows[0].id
  await db.query(`update public.appointments set total_duration = 45 where id = '${own}'`) // não bate com ele mesmo
  assert.equal((await one(db, `select total_duration as d from public.appointments where id = '${own}'`)).d, 45)
})

test('create_public_appointment devolve slot_taken para o cliente (mensagem que o app já traduz)', async () => {
  await db.exec(`set role anon;`)
  try {
    await assert.rejects(
      db.query(`select public.create_public_appointment('${SHOP}', '${barberA}', array['${service}']::uuid[], 'Maria', '88933334444', '${DAY}', '09:00', null, null)`),
      /slot_taken/
    )
  } finally {
    await db.exec('reset role;')
  }
  assert.equal((await rows(db, `select 1 from public.appointments where client_name = 'Maria'`)).length, 0)
})

test('link reservado não pode ser o endereço de um negócio', async () => {
  for (const slug of ['login', 'assets', 'api', 'admin', 'icon', 'manifest', 'landing']) {
    await assert.rejects(db.query(`update public.barbershops set slug = '${slug}' where id = '${SHOP}'`), /slug_not_reserved/, slug)
  }
  await db.query(`update public.barbershops set slug = 'loja-teste' where id = '${SHOP}'`) // um normal continua valendo
})
