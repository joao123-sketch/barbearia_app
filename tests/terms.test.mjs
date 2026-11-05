// Tipos de negócio: o link do panfleto (?tipo=) e o vocabulário de cada tipo.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBusinessType, getTerms, BUSINESS_TYPES } from '../src/lib/terms.ts'

test('?tipo= aceita só os tipos conhecidos, sem diferenciar maiúscula', () => {
  assert.equal(parseBusinessType('lavajato'), 'lavajato')
  assert.equal(parseBusinessType(' Lavajato '), 'lavajato')
  assert.equal(parseBusinessType('salao'), 'salao')
  assert.equal(parseBusinessType('dentista'), null)
  assert.equal(parseBusinessType(''), null)
  assert.equal(parseBusinessType(null), null)
})

test('lava-jato: observação do agendamento pede só o modelo do veículo', () => {
  const t = getTerms('lavajato')
  assert.equal(t.notesLabel, 'Modelo do veículo (opcional)')
  assert.equal(t.anyProfessional, 'Qualquer funcionário')
  assert.match(t.serviceExample, /Lavagem/)
})

test('barbearia e salão mantêm os textos de antes', () => {
  assert.equal(getTerms('barbearia').notesLabel, 'Observações para o barbeiro (opcional)')
  assert.equal(getTerms('salao').notesLabel, 'Observações para o profissional (opcional)')
  assert.equal(getTerms(undefined).Business, 'Barbearia')
})

test('todo tipo tem todos os textos preenchidos', () => {
  for (const type of BUSINESS_TYPES) {
    for (const [key, value] of Object.entries(getTerms(type))) {
      if (key === 'vehicleTypes') continue // só o lava-jato tem lista de tipos de veículo
      assert.ok(String(value).length > 0, `${type}.${key}`)
    }
  }
})

test('lava-jato pede o tipo do veículo; barbearia e salão não', () => {
  const types = getTerms('lavajato').vehicleTypes
  for (const expected of ['Carro de passeio', 'SUV / 4x4', 'Caminhonete', 'Caminhão', 'Moto']) assert.ok(types.includes(expected), expected)
  assert.deepEqual(getTerms('barbearia').vehicleTypes, [])
  assert.deepEqual(getTerms('salao').vehicleTypes, [])
})
