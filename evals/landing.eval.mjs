// Avaliação da landing (faixa periódica: roda o build de produção em um Chrome real).
//   npm run evals
// Passa só se TODAS as verificações passarem. Mede o que importa para o pedido de contatos:
//  - os três canais existem e abrem o aplicativo certo;
//  - cada link de contato é fácil de tocar (44px);
//  - Criar conta e Entrar continuam sendo o destaque (visíveis o tempo todo e bem maiores que os contatos);
//  - nada estoura a largura da tela no celular nem no computador.
import { spawn, spawnSync } from 'node:child_process'
import { launchPage } from './lib/chrome.mjs'

const PORT = 4179
const URL_BASE = `http://127.0.0.1:${PORT}`
const EXPECTED = {
  whatsapp: 'https://wa.me/5588988941408',
  email: 'mailto:sistemaappbarbearia@gmail.com',
  instagram: 'https://www.instagram.com/suaa.gendaapp/'
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASSOU' : 'FALHOU'}  ${name}${detail ? `  (${detail})` : ''}`)
}

// 1) build de produção + servidor de pré-visualização
console.log('Construindo a versão de produção...')
const build = spawnSync(npx, ['vite', 'build', '--logLevel', 'error'], { stdio: 'inherit', shell: process.platform === 'win32' })
if (build.status !== 0) {
  console.error('O build falhou.')
  process.exit(1)
}
const preview = spawn(npx, ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  stdio: 'ignore',
  shell: process.platform === 'win32'
})
const stopPreview = () => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' })
  else preview.kill('SIGKILL')
}
for (let i = 0; i < 40; i++) {
  try {
    if ((await fetch(`${URL_BASE}/login`)).ok) break
  } catch {
    // ainda subindo
  }
  await sleep(250)
}

// Script que roda dentro da página: mede links, tamanhos e posição dos botões principais
const MEASURE = `(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right } }
  const links = (prefix) => [...document.querySelectorAll('a[href^="' + prefix + '"]')]
  const byText = (txt) => [...document.querySelectorAll('button')].filter((b) => b.textContent.trim().startsWith(txt))
  const footer = document.querySelector('footer')
  const footerLinks = footer ? [...footer.querySelectorAll('.lp-contacts a')] : []
  const filled = (el) => { const c = getComputedStyle(el).backgroundColor; return c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' }
  const cta = byText('Criar conta').map((b) => ({ ...rect(b), text: b.textContent.trim(), filled: filled(b) }))
  const enter = byText('Entrar').map((b) => ({ ...rect(b), text: b.textContent.trim() }))
  return {
    hrefs: {
      whatsapp: links('https://wa.me/').map((a) => a.getAttribute('href').split('?')[0]),
      email: links('mailto:').map((a) => a.getAttribute('href').split('?')[0]),
      instagram: links('https://www.instagram.com/').map((a) => a.getAttribute('href'))
    },
    footerContacts: footerLinks.map((a) => ({ href: a.getAttribute('href').split('?')[0], ...rect(a), filled: filled(a) })),
    headerCta: cta.find((b) => b.top < 80) || null,
    headerEnter: enter.find((b) => b.top < 80) || null,
    // botões de verdade (classe lp-btn): o do topo e os de fechamento; o do rodapé é link de texto por projeto
    // todos os links de contato da página (rodapé, preço, fechamento), não só os do rodapé
    contactAnchors: [...document.querySelectorAll('a[href^="https://wa.me/"], a[href^="mailto:"], a[href^="https://www.instagram.com/"]')].map((a) => ({ href: a.getAttribute('href').split('?')[0], h: a.getBoundingClientRect().height })),
    // peso tipográfico: o botão principal precisa ser maior e mais forte que o texto dos contatos
    fonts: (() => {
      const btn = byText('Criar conta').find((b) => b.classList.contains('lp-btn'))
      const link = footerLinks[0]
      if (!btn || !link) return null
      const b = getComputedStyle(btn), l = getComputedStyle(link)
      return { cta: parseFloat(b.fontSize), ctaWeight: Number(b.fontWeight), contact: parseFloat(l.fontSize), contactWeight: Number(l.fontWeight) }
    })(),
    allCtaFilled: (() => { const real = byText('Criar conta').filter((b) => b.classList.contains('lp-btn')); return real.length >= 2 && real.every((b) => filled(b)) })(),
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    vh: window.innerHeight
  }
})()`

try {
  for (const [label, width, height] of [['computador 1440px', 1440, 900], ['celular 390px', 390, 844]]) {
    console.log(`\n== ${label} ==`)
    const page = await launchPage({ width, height })
    try {
      await page.goto(`${URL_BASE}/login`)

      // rola até o fim para o rodapé e as imagens carregarem, e volta ao topo medindo os botões fixos no fim
      await page.eval('window.scrollTo(0, document.documentElement.scrollHeight)')
      await sleep(1200)
      const atBottom = await page.eval(MEASURE)
      await page.eval('window.scrollTo(0, 0)')
      await sleep(600)
      const atTop = await page.eval(MEASURE)

      for (const [channel, expected] of Object.entries(EXPECTED)) {
        const found = atBottom.hrefs[channel]
        check(`${channel}: link para ${expected}`, found.length > 0 && found.every((h) => h === expected), `${found.length} link(s) na página`)
      }

      const footerBy = (prefix) => atBottom.footerContacts.find((c) => c.href.startsWith(prefix))
      for (const [channel, prefix] of [['whatsapp', 'https://wa.me/'], ['email', 'mailto:'], ['instagram', 'https://www.instagram.com/']]) {
        const c = footerBy(prefix)
        check(`rodapé: ${channel} tem alvo de toque de 44px`, !!c && c.h >= 44 && c.w >= 44, c ? `${Math.round(c.w)}x${Math.round(c.h)}` : 'não achei no rodapé')
      }

      check('Criar conta fica visível no topo, no começo da página', !!atTop.headerCta && atTop.headerCta.top >= 0 && atTop.headerCta.bottom <= atTop.vh)
      check('Entrar fica visível no topo, no começo da página', !!atTop.headerEnter && atTop.headerEnter.top >= 0 && atTop.headerEnter.bottom <= atTop.vh)
      check(
        'Criar conta e Entrar seguem visíveis com a página rolada até o fim',
        !!atBottom.headerCta && !!atBottom.headerEnter && atBottom.headerCta.top >= 0 && atBottom.headerEnter.top >= 0 && atBottom.headerCta.bottom <= atBottom.vh
      )
      const small = atBottom.contactAnchors.filter((a) => a.h < 44)
      check('todos os links de contato da página têm 44px de altura (rodapé, preço e fechamento)', atBottom.contactAnchors.length >= 7 && small.length === 0, `${atBottom.contactAnchors.length} links; abaixo de 44px: ${small.map((a) => `${a.href} ${Math.round(a.h)}px`).join(', ') || 'nenhum'}`)
      const f = atBottom.fonts
      check('o botão Criar conta tem fonte maior e mais pesada que os links de contato', !!f && f.cta > f.contact && f.ctaWeight >= f.contactWeight, f ? `botão ${f.cta}px/${f.ctaWeight}, contato ${f.contact}px/${f.contactWeight}` : 'não medi')

      // destaque = preenchimento: todo botão "Criar conta" tem fundo sólido; nenhum link de contato tem
      check('todos os botões Criar conta têm fundo sólido', atBottom.allCtaFilled)
      check('os contatos são links de texto, sem fundo (não competem com os botões)', atBottom.footerContacts.length === 3 && atBottom.footerContacts.every((c) => !c.filled))
      check('sem rolagem lateral', atBottom.scrollW <= atBottom.clientW, `largura ${atBottom.scrollW} de ${atBottom.clientW}`)

      // tela de entrada: a linha "Precisa de ajuda?" com os três canais
      await page.eval(`window.scrollTo(0, 0); [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Entrar').click()`)
      await sleep(900)
      const login = await page.eval(MEASURE)
      const loginHrefs = login.contactAnchors.map((a) => a.href)
      check(
        'tela de login: ajuda com WhatsApp, e-mail e Instagram, cada um com 44px',
        login.contactAnchors.length === 3 && Object.values(EXPECTED).every((h) => loginHrefs.includes(h)) && login.contactAnchors.every((a) => a.h >= 44),
        `${login.contactAnchors.length} links`
      )
    } finally {
      await page.close()
    }
  }
} finally {
  stopPreview()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} de ${results.length} verificações passaram.`)
process.exit(failed.length === 0 ? 0 : 1)
