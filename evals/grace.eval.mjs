// Avaliação do cartão de carência (/master) e dos contatos na tela de bloqueio, em um Chrome real.
//   npm run evals
// Monta os componentes reais com um servidor FALSO (evals/harness/grace.tsx): nunca fala com o Supabase de verdade.
// Passa só se todas as verificações passarem.
import { spawn, spawnSync } from 'node:child_process'
import { launchPage } from './lib/chrome.mjs'

const PORT = 4181
const BASE = `http://127.0.0.1:${PORT}/evals/harness/grace.html`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASSOU' : 'FALHOU'}  ${name}${detail ? `  (${detail})` : ''}`)
}

// O Vite recebe um endereço de Supabase que não existe: mesmo que algo escape do servidor falso, nada chega à produção
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
    if ((await fetch(BASE)).ok) break
  } catch {
    // ainda subindo
  }
  await sleep(250)
}

// Funções que rodam dentro da página
const SET_VALUE = (v) => `(() => { const i = document.getElementById('grace-input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(v)}); i.dispatchEvent(new Event('input', { bubbles: true })) })()`
const STATE = `(() => {
  const save = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Salvar'))
  return {
    input: document.getElementById('grace-input').value,
    saveDisabled: save.disabled,
    effect: document.getElementById('grace-effect').innerText.replace(/\\s+/g, ' '),
    status: document.querySelector('[role=status]')?.innerText.trim() ?? null,
    error: [...document.querySelectorAll('section [role=alert]')].filter((e) => e.id !== 'grace-effect' && !e.closest('#grace-effect')).map((e) => e.innerText).join(' | '),
    parentGrace: document.getElementById('parent-grace').innerText,
    parentPix: document.getElementById('parent-pix').innerText,
    calls: window.__calls.length,
    confirms: window.__confirms.length,
    lastConfirm: window.__confirms[window.__confirms.length - 1] ?? null
  }
})()`
const CLICK_SAVE = `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Salvar')).click()`

try {
  for (const [label, width, height] of [['computador 1280px', 1280, 800], ['celular 390px', 390, 844]]) {
    console.log(`\n== cartão de carência, ${label} ==`)
    const page = await launchPage({ width, height })
    try {
      await page.goto(`${BASE}?screen=grace`, 4000)
      let s = await page.eval(STATE)

      check('abre com o valor do servidor, sem poder salvar e com região de aviso fixa', s.input === '10' && s.saveDisabled && s.status === '', `campo ${s.input}`)
      check('mostra quantas contas ficam bloqueadas com o valor atual', /2 contas ficam bloqueadas/.test(s.effect), s.effect.slice(0, 120))

      // salvar um valor válido
      await page.eval(SET_VALUE('15'))
      await sleep(200)
      s = await page.eval(STATE)
      check('digitar 15 habilita o botão e mostra o efeito antes de salvar', !s.saveDisabled && /1 conta fica bloqueada.*hoje: 2/.test(s.effect), s.effect.slice(0, 160))
      await page.eval(CLICK_SAVE)
      await sleep(700)
      s = await page.eval(STATE)
      const call = await page.eval('JSON.stringify(window.__calls[0])')
      check('salvar 15 grava só carência e data, uma única vez', s.calls === 1 && /^\{"table":"platform_settings","payload":\{"grace_days":15,"updated_at":"[^"]+"\}\}$/.test(call), call)
      check('depois de salvar: aviso "Salvo", valor no painel pai e botão desabilitado', /Salvo/.test(s.status ?? '') && s.parentGrace === '15' && s.saveDisabled)

      // entradas inválidas nunca chegam ao servidor
      const before = s.calls
      for (const [typed, expected] of [['', 'Digite um número'], ['7,5', 'inteiro'], ['abc', 'só números'], ['99', '0 a 60'], ['-1', '0 a 60']]) {
        await page.eval(SET_VALUE(typed))
        await sleep(150)
        s = await page.eval(STATE)
        check(`entrada ${JSON.stringify(typed)} é recusada com aviso e sem poder salvar`, s.saveDisabled && s.effect.includes(expected), s.effect.slice(0, 90))
      }
      check('nenhuma entrada inválida gerou chamada ao servidor', s.calls === before)

      // confirmação de bloqueio em massa (uma só, mesmo com dois motivos)
      await page.eval('window.__confirmAnswer = false')
      await page.eval(SET_VALUE('3'))
      await sleep(150)
      await page.eval(CLICK_SAVE)
      await sleep(400)
      s = await page.eval(STATE)
      check('carência que bloqueia contas pede confirmação; ao recusar, nada é gravado', s.confirms === 1 && /3 contas ficam bloqueadas agora/.test(s.lastConfirm) && s.calls === before, s.lastConfirm)
      await page.eval('window.__confirmAnswer = true')
      await page.eval(CLICK_SAVE)
      await sleep(700)
      s = await page.eval(STATE)
      check('ao confirmar, grava 3', s.calls === before + 1 && s.parentGrace === '3')

      const confirmsBefore = s.confirms
      await page.eval(SET_VALUE('0'))
      await sleep(150)
      await page.eval(CLICK_SAVE)
      await sleep(700)
      s = await page.eval(STATE)
      check('"sem carência" com contas afetadas gera UMA confirmação com os dois avisos', s.confirms === confirmsBefore + 1 && /bloqueada.* e .*dia seguinte ao vencimento/.test(s.lastConfirm), s.lastConfirm)

      // sem permissão: o banco devolve zero linhas
      await page.eval("window.__mode = 'owner'; window.__confirmAnswer = true")
      await page.eval(SET_VALUE('30'))
      await sleep(150)
      await page.eval(CLICK_SAVE)
      await sleep(700)
      s = await page.eval(STATE)
      check('sem permissão (zero linhas): mostra o erro e NÃO mostra "Salvo" nem muda o painel', /Só o administrador/.test(s.error) && !/Salvo/.test(s.status ?? '') && s.parentGrace === '0', `erro: ${s.error}`)

      // regra do banco
      await page.eval("window.__mode = 'check'")
      await page.eval(SET_VALUE('20'))
      await sleep(150)
      await page.eval(CLICK_SAVE)
      await sleep(700)
      s = await page.eval(STATE)
      check('o banco recusa o valor: o erro é traduzido para o administrador', /entre 0 e 60/.test(s.error), `erro: ${s.error}`)

      // gravação concorrente: o formulário do PIX muda enquanto a carência salva
      await page.eval("window.__mode = 'admin'")
      await page.eval(SET_VALUE('12'))
      await sleep(150)
      await page.eval(`${CLICK_SAVE}; window.__setPix('PIX-B')`)
      await sleep(900)
      s = await page.eval(STATE)
      check('gravações ao mesmo tempo não se sobrescrevem (carência 12 e PIX-B ficam)', s.parentGrace === '12' && s.parentPix === 'PIX-B', `grace ${s.parentGrace}, pix ${s.parentPix}`)

      // outro administrador mudou o valor: ao voltar para a aba o campo acompanha
      await page.eval('window.__serverGrace = 5; window.dispatchEvent(new Event("focus"))')
      await sleep(700)
      s = await page.eval(STATE)
      check('ao voltar para a aba, relê o servidor e o campo mostra 5', s.input === '5' && s.parentGrace === '5', `campo ${s.input}`)

      const overflow = await page.eval('document.documentElement.scrollWidth <= document.documentElement.clientWidth')
      check('sem rolagem lateral', overflow)
    } finally {
      await page.close()
    }
  }

  for (const [label, width, height] of [['computador 1280px', 1280, 800], ['celular 390px', 390, 844]]) {
    console.log(`\n== tela de bloqueio, ${label} ==`)
    const page = await launchPage({ width, height })
    try {
      await page.goto(`${BASE}?screen=locked`, 4000)
      await sleep(1200)
      const lock = await page.eval(`(() => ({
        text: document.body.innerText,
        links: [...document.querySelectorAll('a')].map((a) => ({ href: a.getAttribute('href').split('?')[0], h: a.getBoundingClientRect().height, text: a.textContent.trim(), rel: a.getAttribute('rel') })),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      }))()`)
      const hrefs = lock.links.map((l) => l.href)
      check('mostra que o acesso está bloqueado e oferece pagar', /Acesso bloqueado/.test(lock.text))
      check('WhatsApp, e-mail e Instagram do suporte presentes', ['https://wa.me/5588988941408', 'mailto:sistemaappbarbearia@gmail.com', 'https://www.instagram.com/suaa.gendaapp/'].every((h) => hrefs.includes(h)), hrefs.join(', '))
      const support = lock.links.filter((l) => /wa\.me|mailto|instagram/.test(l.href))
      // o link dentro de uma frase ("Fale com o suporte") é texto corrido e fica fora da regra de alvo de toque
      const standalone = support.filter((l) => !/Fale com o suporte/.test(l.text))
      check('os links de suporte fora de frases têm 44px de altura', standalone.length >= 3 && standalone.every((l) => l.h >= 44), standalone.map((l) => `${Math.round(l.h)}px`).join(' '))
      check('links externos abrem com rel seguro', support.filter((l) => l.href.startsWith('https')).every((l) => l.rel === 'noopener noreferrer'))
      check('o texto "Fale com o suporte" do Pix sem configuração é um link', lock.links.some((l) => /Fale com o suporte/.test(l.text)))
      check('sem rolagem lateral', !lock.overflow)
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
