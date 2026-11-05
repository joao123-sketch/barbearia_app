// Link de agendamento gerado do nome do negócio: sem acento, sem espaço, dentro do limite do banco.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/lib/slugRules.ts'

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

test('a lista de links reservados é a mesma no app, no worker e no banco', async () => {
  const { readFileSync, readdirSync } = await import('node:fs')
  const { RESERVED_SLUGS, isReservedSlug } = await import('../src/lib/slugRules.ts')
  assert.ok(isReservedSlug('login') && isReservedSlug('b') && isReservedSlug('assets') && isReservedSlug('api'))
  assert.ok(!isReservedSlug('turbocar'))

  // o worker usa a mesma lista (importa de slugRules)
  assert.match(readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8'), /new Set<string>\(RESERVED_SLUGS\)/)

  // a migração mais recente que define a regra no banco lista exatamente os mesmos nomes
  const dir = new URL('../supabase/migrations/', import.meta.url)
  const file = readdirSync(dir).filter((f) => /slug_not_reserved|reserved_slugs/.test(readFileSync(new URL(f, dir), 'utf8')) || f.includes('reserved')).sort().pop()
  const sql = readFileSync(new URL(file, dir), 'utf8')
  const block = sql.match(/barbershops_slug_not_reserved[\s\S]*?check \(slug not in \(([^)]*)\)\)/)[1]
  const inDb = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
  assert.deepEqual(inDb, [...RESERVED_SLUGS].sort())
})
