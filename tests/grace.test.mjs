// Carência: regras puras da tela (rápidas). As regras do banco ficam em tests/db/grace.db.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  mergeBillingFields,
  firstBlockedDate,
  getBillingState,
  addDays,
  todayBR,
  parseGraceInput,
  graceUpdatePayload,
  requireSavedGrace,
  withoutGrace,
  DEFAULT_GRACE_DAYS,
  GRACE_MAX,
  GRACE_MIN
} from '../src/lib/billing.ts'

test('os limites da carência são 0 e 60, iguais aos do banco', () => {
  assert.equal(GRACE_MIN, 0)
  assert.equal(GRACE_MAX, 60)
  assert.equal(DEFAULT_GRACE_DAYS, 10)
})

test('parseGraceInput: só inteiro de 0 a 60 vale; nada é corrigido em silêncio', () => {
  assert.deepEqual(parseGraceInput('10'), { ok: true, value: 10 })
  assert.deepEqual(parseGraceInput(' 0 '), { ok: true, value: 0 })
  assert.deepEqual(parseGraceInput('60'), { ok: true, value: 60 })
  assert.deepEqual(parseGraceInput('7.0'), { ok: true, value: 7 })
  assert.deepEqual(parseGraceInput(''), { ok: false, reason: 'empty' })
  assert.deepEqual(parseGraceInput('   '), { ok: false, reason: 'empty' })
  assert.deepEqual(parseGraceInput('abc'), { ok: false, reason: 'invalid' })
  assert.deepEqual(parseGraceInput('1e3'), { ok: false, reason: 'invalid' })
  assert.deepEqual(parseGraceInput('7,5'), { ok: false, reason: 'decimal' })
  assert.deepEqual(parseGraceInput('7.5'), { ok: false, reason: 'decimal' })
  assert.deepEqual(parseGraceInput('-1'), { ok: false, reason: 'range' })
  assert.deepEqual(parseGraceInput('61'), { ok: false, reason: 'range' })
})

test('graceUpdatePayload: grava só a carência e a data; valor inválido lança em vez de virar outro número', () => {
  assert.deepEqual(graceUpdatePayload(7, '2026-10-28T12:00:00.000Z'), { grace_days: 7, updated_at: '2026-10-28T12:00:00.000Z' })
  assert.deepEqual(graceUpdatePayload(0, 'x'), { grace_days: 0, updated_at: 'x' })
  assert.deepEqual(graceUpdatePayload(60, 'x'), { grace_days: 60, updated_at: 'x' })
  assert.deepEqual(Object.keys(graceUpdatePayload(5, 'x')).sort(), ['grace_days', 'updated_at'])
  for (const bad of [-1, 61, 500, 7.5, NaN, Infinity]) {
    assert.throws(() => graceUpdatePayload(bad, 'x'), /grace_days_check/, `valor ${bad}`)
  }
})

test('mergeBillingFields: a releitura traz só os campos de cobrança e preserva o que o dono está editando', () => {
  const current = { id: 's', name: 'Nome editado agora', slogan: 'rascunho', subscription_status: 'active', next_billing_date: '2026-11-10', monthly_fee: 49.9, next_monthly_fee: undefined, last_payment_date: '2026-10-10' }
  const fresh = { id: 's', name: 'Nome antigo do servidor', slogan: 'antigo', subscription_status: 'active', next_billing_date: '2026-12-10', monthly_fee: 59.9, next_monthly_fee: 59.9, last_payment_date: '2026-11-10' }
  const merged = mergeBillingFields(current, fresh)
  assert.equal(merged.next_billing_date, '2026-12-10', 'pagamento confirmado no servidor aparece')
  assert.equal(merged.monthly_fee, 59.9)
  assert.equal(merged.next_monthly_fee, 59.9)
  assert.equal(merged.last_payment_date, '2026-11-10')
  assert.equal(merged.name, 'Nome editado agora', 'não pisa no que está sendo editado')
  assert.equal(merged.slogan, 'rascunho')
  assert.equal(current.next_billing_date, '2026-11-10', 'não altera o original')
  // sem mudança de cobrança: devolve o mesmo objeto (a tela não redesenha à toa)
  assert.equal(mergeBillingFields(current, { ...current, name: 'qualquer' }), current)
})

test('o /master grava com o estado mais recente: carência do cartão e do formulário do PIX nunca se sobrescrevem', () => {
  const master = readFileSync(new URL('../src/components/MasterAdminDashboard.tsx', import.meta.url), 'utf8')
  assert.match(master, /onSaved=\{\(days\) => onSettings\(\(prev\) => \(\{ \.\.\.prev, grace_days: days \}\)\)\}/)
  assert.match(master, /onSettings\(\(prev\) => \(\{ \.\.\.clean, grace_days: prev\.grace_days \}\)\)/)
  assert.match(master, /onSettings: React\.Dispatch<React\.SetStateAction<PlatformSettings>>/)
})

test('o painel do dono relê cobrança e carência sozinho (a cada minuto e ao voltar para a aba)', () => {
  const hook = readFileSync(new URL('../src/lib/useOwnerData.ts', import.meta.url), 'utf8')
  assert.match(hook, /refreshBilling/)
  assert.match(hook, /fetchPlatformSettings\(\)/)
  assert.match(hook, /mergeBillingFields/)
  assert.match(hook, /setInterval\(refreshBilling, 60000\)/)
  assert.match(hook, /addEventListener\('focus', onVisible\)/)
})

test('requireSavedGrace: sem linha gravada não existe sucesso (o banco recusa por permissão sem dar erro)', () => {
  assert.throws(() => requireSavedGrace([]), /forbidden/)
  assert.throws(() => requireSavedGrace(null), /forbidden/)
  assert.throws(() => requireSavedGrace(undefined), /forbidden/)
  assert.equal(requireSavedGrace([{ grace_days: 7 }]), 7)
  assert.equal(requireSavedGrace([{ grace_days: '12' }]), 12)
})

test('withoutGrace: o formulário de PIX nunca leva a carência (não desfaz uma mudança feita no cartão)', () => {
  const settings = { monthly_fee: 49.9, pix_key: 'abc', grace_days: 3, invoice_lead_days: 7 }
  const sent = withoutGrace(settings)
  assert.equal('grace_days' in sent, false)
  assert.deepEqual(sent, { monthly_fee: 49.9, pix_key: 'abc', invoice_lead_days: 7 })
  assert.equal(settings.grace_days, 3, 'não altera o original')
})

test('firstBlockedDate: vencimento + carência + 1', () => {
  assert.equal(firstBlockedDate('2026-11-15', 10), '2026-11-26')
  assert.equal(firstBlockedDate('2026-11-15', 0), '2026-11-16')
  assert.equal(firstBlockedDate('2026-02-27', 3), '2026-03-03') // fev/2026 tem 28 dias: 27 + 4 = 3 de março
})

test('addDays em texto não depende do fuso do aparelho', () => {
  const original = process.env.TZ
  try {
    for (const tz of ['UTC', 'Asia/Tokyo', 'Pacific/Honolulu', 'America/Rio_Branco', 'America/Sao_Paulo']) {
      process.env.TZ = tz
      assert.equal(addDays('2026-03-01', -1), '2026-02-28', tz)
      assert.equal(addDays('2026-12-31', 1), '2027-01-01', tz)
      assert.equal(addDays('2026-11-15', 11), '2026-11-26', tz)
    }
  } finally {
    process.env.TZ = original
  }
})

test('todayBR: o dia de Brasília, igual ao banco, em qualquer fuso do aparelho', () => {
  const original = process.env.TZ
  try {
    // 01:30 UTC de 20/11 ainda é 22:30 de 19/11 em Brasília
    const instant = new Date('2026-11-20T01:30:00Z')
    for (const tz of ['UTC', 'Asia/Tokyo', 'Pacific/Honolulu', 'America/Rio_Branco', 'America/Manaus', 'America/Sao_Paulo']) {
      process.env.TZ = tz
      assert.equal(todayBR(instant), '2026-11-19', tz)
    }
    // e 03:30 UTC já é o dia 20 em Brasília (00:30)
    process.env.TZ = 'Asia/Tokyo'
    assert.equal(todayBR(new Date('2026-11-20T03:30:00Z')), '2026-11-20')
  } finally {
    process.env.TZ = original
  }
})

test('getBillingState: o veredito é o mesmo em qualquer fuso (Rio Branco e Manaus não divergem do banco na virada do dia)', () => {
  const original = process.env.TZ
  try {
    // 22:30 em Brasília de 19/11: vence 15/11 -> 4 dias de atraso
    const instant = new Date('2026-11-20T01:30:00Z')
    const shop = { next_billing_date: '2026-11-15', subscription_status: 'active' }
    for (const tz of ['UTC', 'Asia/Tokyo', 'Pacific/Honolulu', 'America/Rio_Branco', 'America/Manaus', 'America/Sao_Paulo']) {
      process.env.TZ = tz
      const state = getBillingState(shop, 3, instant)
      assert.equal(state.overdueDays, 4, tz)
      assert.equal(state.status, 'blocked', tz)
      assert.equal(getBillingState(shop, 4, instant).status, 'expired', tz)
    }
  } finally {
    process.env.TZ = original
  }
})

test('getBillingState: a carência recebida decide quando bloqueia', () => {
  const now = new Date('2026-11-20T15:00:00Z')
  const shop = (overdue) => ({ next_billing_date: addDays('2026-11-20', -overdue), subscription_status: 'active' })
  const status = (overdue, grace) => getBillingState(shop(overdue), grace, now).status
  assert.equal(status(5, 10), 'expired')
  assert.equal(status(10, 10), 'expired')
  assert.equal(status(11, 10), 'blocked')
  assert.equal(status(11, 30), 'expired')
  assert.equal(status(1, 0), 'blocked')
  assert.equal(status(0, 0), 'active')
})

test('getBillingState: dias até o bloqueio contam a carência configurada', () => {
  const now = new Date('2026-11-20T15:00:00Z')
  const state = getBillingState({ next_billing_date: '2026-11-17', subscription_status: 'active' }, 10, now)
  assert.equal(state.overdueDays, 3)
  assert.equal(state.graceDaysLeft, 7)
  assert.equal(firstBlockedDate(state.dueDate, 10), '2026-11-28')
})
