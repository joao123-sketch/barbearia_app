// Link de agendamento gerado do nome do negócio: sem acento, sem espaço, dentro do limite do banco.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/lib/slug.ts'

test('tira acento, símbolo e espaço', () => {
  assert.equal(slugify('Barbearia Corte & Bém Ação!'), 'barbearia-corte-bem-acao')
  assert.equal(slugify('  Studio   Bela Vida  '), 'studio-bela-vida')
})

test('nome só com símbolo vira vazio (o cadastro usa "meu-negocio")', () => {
  assert.equal(slugify('!!!'), '')
})

test('respeita o limite de 60 caracteres do banco, sem terminar em hífen', () => {
  const slug = slugify('a'.repeat(49) + ' ' + 'b'.repeat(40))
  assert.ok(slug.length <= 60)
  assert.ok(!slug.endsWith('-'))
  assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/)
})
