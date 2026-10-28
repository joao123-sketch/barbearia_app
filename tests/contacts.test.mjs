// Canais de contato: os três links certos, em um único lugar do código, presentes em todos os pontos de suporte.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SUPPORT_CONTACTS, whatsappUrl, mailtoUrl, instagramUrl, whatsappDisplay, instagramDisplay } from '../src/lib/contacts.ts'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (path) => readFileSync(join(root, path), 'utf8')

const walk = (dir, accept) => {
  const found = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) found.push(...walk(path, accept))
    else if (accept(path)) found.push(path)
  }
  return found
}
const norm = (p) => p.replace(/\\/g, '/')

test('WhatsApp: wa.me com 55 + DDD + número', () => {
  assert.equal(whatsappUrl(), 'https://wa.me/5588988941408')
  assert.equal(whatsappUrl('Olá! Quero ajuda'), 'https://wa.me/5588988941408?text=Ol%C3%A1!%20Quero%20ajuda')
  assert.equal(whatsappDisplay(), '(88) 98894-1408')
})

test('E-mail: mailto para o Gmail do suporte, com assunto e corpo codificados', () => {
  assert.equal(mailtoUrl(), 'mailto:sistemaappbarbearia@gmail.com')
  assert.equal(mailtoUrl('Ajuda'), 'mailto:sistemaappbarbearia@gmail.com?subject=Ajuda')
  assert.equal(
    mailtoUrl('Dúvida', 'Olá & obrigado'),
    'mailto:sistemaappbarbearia@gmail.com?subject=D%C3%BAvida&body=Ol%C3%A1%20%26%20obrigado'
  )
})

test('Instagram: perfil oficial com barra final', () => {
  assert.equal(instagramUrl(), 'https://www.instagram.com/suaa.gendaapp/')
  assert.equal(instagramDisplay(), '@suaa.gendaapp')
})

test('compatibilidade: SUPPORT_WHATSAPP continua exportado e vem do contato central', () => {
  assert.match(read('src/lib/platform.ts'), /export const SUPPORT_WHATSAPP = SUPPORT_CONTACTS\.whatsapp/)
})

test('fonte única: número, e-mail e perfil só aparecem escritos em src/lib/contacts.ts', () => {
  const files = [
    ...walk(join(root, 'src'), (p) => /\.(ts|tsx)$/.test(p)),
    ...walk(join(root, 'supabase', 'functions'), (p) => /\.ts$/.test(p)),
    join(root, 'index.html')
  ]
  const hits = []
  for (const path of files) {
    if (norm(path).endsWith('src/lib/contacts.ts')) continue
    const text = readFileSync(path, 'utf8')
    // send-notifications é código Deno e não importa de src/: o e-mail ali é só o contato do certificado de notificação (VAPID)
    const body = norm(path).endsWith('send-notifications/index.ts') ? text.replace("'mailto:sistemaappbarbearia@gmail.com'", '') : text
    if (body.includes('88988941408') || body.includes('sistemaappbarbearia@gmail.com') || body.includes('suaa.gendaapp')) hits.push(norm(path))
  }
  assert.deepEqual(hits, [])
})

test('nenhum componente monta à mão o link do suporte (o padrão antigo com SUPPORT_WHATSAPP)', () => {
  const offenders = walk(join(root, 'src'), (p) => /\.(ts|tsx)$/.test(p))
    .filter((p) => !norm(p).endsWith('src/lib/platform.ts'))
    .filter((p) => /SUPPORT_WHATSAPP/.test(readFileSync(p, 'utf8')))
    .map(norm)
  assert.deepEqual(offenders, [])
})

test('o número dos comprovantes (configurável no /master) segue separado do contato de suporte, e isso está dito no código', () => {
  const panel = read('src/components/BillingPanel.tsx')
  assert.ok(panel.includes('não é o contato de suporte de contacts.ts'))
  assert.ok(panel.includes('toWaNumber(whatsapp)'))
})

test('todos os pontos de suporte usam o ContactLinks', () => {
  const spots = {
    'src/components/LandingPage.tsx': /<ContactLinks variant="landing"/,
    'src/components/AdminDashboard.tsx': /<ContactLinks\s+variant="panel"/,
    'src/components/BillingNotices.tsx': /<ContactLinks\s+variant="panel"/,
    'src/components/BarberAuth.tsx': /<ContactLinks variant="inline"/
  }
  for (const [file, pattern] of Object.entries(spots)) assert.match(read(file), pattern, `${file} sem ContactLinks`)
})

test('os textos "Fale com o suporte" são links, não texto solto', () => {
  assert.match(read('src/components/PixPayment.tsx'), /whatsappUrl\([^)]*\)[^>]*>\s*Fale com o suporte/s)
  assert.match(read('src/components/BillingPanel.tsx'), /whatsappUrl\([^)]*\)[\s\S]{0,300}Falar com o suporte no WhatsApp/)
})

test('o ContactLinks entrega os três canais em todas as variantes', () => {
  const source = read('src/components/ContactLinks.tsx')
  for (const variant of ["variant === 'inline'", "variant === 'panel'"]) assert.ok(source.includes(variant), variant)
  // cada variante monta os três destinos a partir das mesmas três constantes
  assert.equal((source.match(/href=\{wa\}/g) || []).length, 3, 'WhatsApp em 3 variantes')
  assert.equal((source.match(/href=\{mail\}/g) || []).length, 3, 'E-mail em 3 variantes')
  assert.equal((source.match(/href=\{ig\}/g) || []).length, 3, 'Instagram em 3 variantes')
  assert.equal((source.match(/rel="noopener noreferrer"/g) || []).length, 6, 'links externos com rel seguro (WhatsApp e Instagram)')
})

test('o texto visível do contato não repete o número escrito à mão', () => {
  const landing = read('src/components/ContactLinks.tsx')
  assert.ok(landing.includes('whatsappDisplay()') && landing.includes('SUPPORT_CONTACTS.email') && landing.includes('instagramDisplay()'))
})

test('SUPPORT_CONTACTS tem exatamente os três canais pedidos', () => {
  assert.deepEqual(SUPPORT_CONTACTS, { whatsapp: '88988941408', email: 'sistemaappbarbearia@gmail.com', instagramHandle: 'suaa.gendaapp' })
})
