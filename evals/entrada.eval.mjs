// Avaliação dos contatos no topo da página inicial e da tela de entrada com o passo a passo, em um Chrome real.
//   npm run evals
// Usa o servidor de desenvolvimento apontando para um Supabase que não existe: nada chega à produção.
// Passa só se todas as verificações passarem.
import { spawn, spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { launchPage } from './lib/chrome.mjs'

const PORT = 4182
const BASE = `http://127.0.0.1:${PORT}`
const EXPECTED = ['https://wa.me/5588988941408', 'mailto:sistemaappbarbearia@gmail.com', 'https://www.instagram.com/suaa.gendaapp/']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASSOU' : 'FALHOU'}  ${name}${detail ? `  (${detail})` : ''}`)
}

const vite = spawn(npx, ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
  env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'avaliacao-sem-acesso' }
})
const stopVite = () => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' })
  else vite.kill('SIGKILL')
}
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch(`${BASE}/login`)).ok) break
  } catch {
    // ainda subindo
  }
  await sleep(250)
}

const TOP = `(() => {
  const strip = document.querySelector('.lp-top')
  const r = strip.getBoundingClientRect()
  const links = [...strip.querySelectorAll('a')].map((a) => { const b = a.getBoundingClientRect(); return { href: a.getAttribute('href').split('?')[0], rel: a.getAttribute('rel'), w: b.width, h: b.height, top: b.top, bottom: b.bottom, text: a.innerText.trim() } })
  const header = document.querySelector('.lp-bar').getBoundingClientRect()
  const btn = (t) => [...document.querySelectorAll('.lp-bar button')].find((b) => b.textContent.trim().startsWith(t))?.getBoundingClientRect()
  const cta = btn('Criar conta'), enter = btn('Entrar')
  return {
    stripTop: r.top, stripBottom: r.bottom, vh: innerHeight, links,
    full: [...strip.querySelectorAll('.lp-top-full')].map((e) => getComputedStyle(e).display !== 'none'),
    headerTop: header.top, headerBottom: header.bottom,
    cta: cta && { top: cta.top, bottom: cta.bottom }, enter: enter && { top: enter.top, bottom: enter.bottom },
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }
})()`

const LOGIN = `(() => {
  const vis = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, h: b.height } }
  const btn = (t, root = document) => [...root.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(t))
  const card = document.getElementById('novo-aqui')?.closest('section')
  const form = document.querySelector('form')
  return {
    heading: document.getElementById('novo-aqui')?.innerText ?? null,
    lowContrast: card ? [...card.querySelectorAll('h2, h3, p, li span, button span')].map((el) => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
      const rgb = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
      let bgEl = el, bg
      while (bgEl) { const cs = getComputedStyle(bgEl); const stop = cs.backgroundImage.match(/(?:oklch|oklab|rgba?|color)\([^)]*\)/); const c = stop ? stop[0] : cs.backgroundColor; const v = rgb(c); if (v[3] > 0.9) { bg = v; break } bgEl = bgEl.parentElement }
      const fg = rgb(getComputedStyle(el).color)
      const [a, b] = [lum(fg), lum(bg ?? [255, 255, 255])].sort((x, y) => y - x)
      return { text: el.innerText.trim().slice(0, 30), ratio: (a + 0.05) / (b + 0.05) }
    }).filter((x) => x.text && x.ratio < 4.5) : [],
    note: card ? [...card.querySelectorAll('p')].map((p) => p.innerText).find((t) => /já usou o teste/.test(t)) ?? null : null,
    steps: card ? [...card.querySelectorAll('ol > li')].map((li) => li.innerText.replace(/\\s+/g, ' ')) : [],
    trust: card ? [...card.querySelectorAll('ul > li')].map((li) => li.innerText.trim()) : [],
    enter: vis(btn('Entrar', form)), formCreate: vis(btn('Criar conta grátis', form)), cardCreate: vis(btn('Criar conta grátis', card)),
    card: { ...vis(card), text: card.innerText }, form: vis(form), vh: innerHeight,
    help: [...document.querySelectorAll('a')].filter((a) => /wa\\.me|mailto|instagram/.test(a.getAttribute('href'))).length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }
})()`

const CLICK = (text) => `[...document.querySelectorAll('.lp-bar button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)})).click()`

try {
  for (const [label, width, height, wide] of [['computador 1280px', 1280, 800, true], ['celular 390px', 390, 844, false], ['celular pequeno 320px', 320, 640, false]]) {
    console.log(`\n== topo da página inicial, ${label} ==`)
    let page = await launchPage({ width, height })
    try {
      await page.goto(`${BASE}/login`, 8000)
      const t = await page.eval(TOP)
      check('a faixa de contatos é a primeira coisa da página, no começo da tela', t.stripTop === 0 && t.stripBottom <= t.vh / 4, `altura ${Math.round(t.stripBottom)}px`)
      check('WhatsApp, e-mail e Instagram com os endereços certos', EXPECTED.every((h) => t.links.some((l) => l.href === h)), t.links.map((l) => l.href).join(', '))
      check('cada link tem 44px de altura e está visível na primeira tela', t.links.length === 3 && t.links.every((l) => l.h >= 44 && l.bottom <= t.vh && l.top >= 0), t.links.map((l) => `${Math.round(l.w)}x${Math.round(l.h)}`).join(' '))
      check('links externos abrem com rel seguro', t.links.filter((l) => l.href.startsWith('https')).every((l) => l.rel === 'noopener noreferrer'))
      check(wide ? 'no computador mostra o número e o e-mail por extenso' : 'no celular mostra só o nome do canal, sem quebrar a linha', wide ? t.full.every(Boolean) : t.full.every((v) => !v) && t.stripBottom <= 46, t.links.map((l) => l.text.replace(/\s+/g, ' ')).join(' | '))
      check('Criar conta e Entrar continuam visíveis logo abaixo, na primeira tela', t.cta && t.enter && t.cta.bottom <= t.vh && t.enter.bottom <= t.vh && t.cta.top >= t.stripBottom && t.enter.top >= t.stripBottom)
      check('sem rolagem lateral', !t.overflow)
    } finally {
      await page.close()
    }

    console.log(`\n== tela de entrada, ${label} ==`)
    page = await launchPage({ width, height })
    try {
      await page.goto(`${BASE}/login`, 8000)
      await page.eval(CLICK('Entrar'))
      await sleep(600)
      const l = await page.eval(LOGIN)
      check('mostra "Crie sua conta em menos de 1 minuto"', /menos de 1 minuto/.test(l.heading ?? ''), l.heading ?? 'sem cartão')
      check('o passo a passo tem 3 passos, o último com painel liberado na hora', l.steps.length === 3 && /Entre no painel na hora/.test(l.steps[2]) && /Dados do negócio/.test(l.steps[0]), `${l.steps.length} passos`)
      const presets = Number((await readFile(new URL('../src/lib/stylePresets.ts', import.meta.url), 'utf8')).match(/\{ id: '/g)?.length ?? 0)
      check('o número de estilos do cartão é o do código', presets > 0 && l.steps[1].includes(`${presets} estilos`), `${presets} no código`)
      check('todo texto do cartão tem contraste mínimo de 4,5:1', l.lowContrast.length === 0, l.lowContrast.map((x) => `${x.text} ${x.ratio.toFixed(2)}`).join('; ') || 'ok')
      check('avisa que o teste grátis depende de não ter testado antes', /já usou o teste, o acesso só abre depois da primeira mensalidade/.test(l.note ?? ''))
      const trialDays = Number((await readFile(new URL('../src/lib/billing.ts', import.meta.url), 'utf8')).match(/TRIAL_DAYS = (\d+)/)?.[1])
      check('"na hora" só aparece junto de "ainda não testou" ou do teste, nunca como acesso garantido', !/acesso liberado/i.test(l.card.text) && /ainda não testou/.test(l.card.text), 'texto do cartão sem "acesso liberado"')
      check('destaca acesso imediato, 20 dias grátis, sem cartão e sem taxa', ['Teste liberado na hora', `${trialDays} dias grátis para testar`, 'Sem cartão', 'Sem taxa por agendamento'].every((x) => l.trust.includes(x)), l.trust.join(', '))
      check('Entrar e Criar conta grátis aparecem juntos na primeira tela', l.enter && l.formCreate && l.enter.bottom <= l.vh && l.formCreate.bottom <= l.vh, `entrar até ${Math.round(l.enter?.bottom ?? 0)}px, criar até ${Math.round(l.formCreate?.bottom ?? 0)}px de ${l.vh}px`)
      check(wide ? 'no computador o cartão fica ao lado do formulário' : 'no celular o cartão fica abaixo do formulário', wide ? l.card.left >= l.form.right - 1 && Math.abs(l.card.top - l.form.top) < 40 : l.card.top >= l.form.bottom - 1)
      check('o ajuda (WhatsApp, e-mail, Instagram) continua na tela', l.help === 3)
      check('sem rolagem lateral', !l.overflow)
      await page.eval(`[...document.getElementById('novo-aqui').closest('section').querySelectorAll('button')].find((b) => b.textContent.includes('Criar conta grátis')).click()`)
      await sleep(800)
      const reg = await page.eval(`document.body.innerText.includes('Cadastre seu negócio')`)
      check('o botão do cartão abre o cadastro', reg)
    } finally {
      await page.close()
    }
  }
} finally {
  stopVite()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} de ${results.length} verificações passaram.`)
process.exit(failed.length === 0 ? 0 : 1)
