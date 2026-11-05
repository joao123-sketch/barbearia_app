// Ícone do app gerado pelo worker: só imagem de pixels; SVG (que pode ter script) é recusado.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDataUrl } from '../worker/index.ts'

const b64 = (s) => Buffer.from(s).toString('base64')

test('aceita PNG, JPEG, WebP e GIF', () => {
  for (const type of ['png', 'jpeg', 'webp', 'gif']) {
    const r = parseDataUrl(`data:image/${type};base64,${b64('conteudo')}`)
    assert.equal(r?.type, `image/${type}`)
    assert.equal(r?.bytes.length, 'conteudo'.length)
  }
})

test('recusa SVG, mesmo disfarçado, e qualquer coisa que não seja imagem de pixels', () => {
  const svg = b64('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>')
  assert.equal(parseDataUrl(`data:image/svg+xml;base64,${svg}`), null)
  assert.equal(parseDataUrl(`data:image/SVG+XML;base64,${svg}`), null)
  assert.equal(parseDataUrl(`data:text/html;base64,${b64('<script>1</script>')}`), null)
  assert.equal(parseDataUrl('javascript:alert(1)'), null)
  assert.equal(parseDataUrl('data:image/png;base64,@@@não-é-base64'), null)
})
