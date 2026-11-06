// Encurtador do link: devolve o curto quando o serviço responde e o próprio link quando falha.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shortenLink } from '../src/lib/shorten.ts'

const URL_FULL = 'https://exemplo.dev/brilho'

test('usa o link curto do serviço', async () => {
  globalThis.fetch = async () => ({ json: async () => ({ shorturl: 'https://is.gd/abc123' }) })
  assert.equal(await shortenLink(URL_FULL), 'https://is.gd/abc123')
})

test('se o serviço falhar, devolve o link original', async () => {
  globalThis.fetch = async () => { throw new Error('sem rede') }
  assert.equal(await shortenLink(URL_FULL), URL_FULL)
})

test('ignora resposta estranha (não vira link de outro domínio)', async () => {
  globalThis.fetch = async () => ({ json: async () => ({ shorturl: 'https://malicioso.com/x' }) })
  assert.equal(await shortenLink(URL_FULL), URL_FULL)
})

test('não encurta endereço local', async () => {
  globalThis.fetch = async () => { throw new Error('não deveria chamar') }
  assert.equal(await shortenLink('http://localhost:5173/x'), 'http://localhost:5173/x')
})
