// Cliente mínimo do Chrome DevTools Protocol (sem dependências): abre um Chrome headless e executa JavaScript na página.
// Precisa de Node 22+ (WebSocket nativo) e de Chrome ou Edge instalado (ou CHROME_PATH).
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function findChrome() {
  const fromEnv = process.env.CHROME_PATH
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  const pf = process.env.PROGRAMFILES || 'C:\\Program Files'
  const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)'
  const candidates = [
    join(pf, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Microsoft/Edge/Application/msedge.exe'),
    join(pf, 'Microsoft/Edge/Application/msedge.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ]
  return candidates.find((c) => existsSync(c)) ?? null
}

export async function launchPage({ width, height }) {
  const exe = findChrome()
  if (!exe) throw new Error('Chrome ou Edge não encontrado. Instale um ou defina CHROME_PATH.')
  const profile = mkdtempSync(join(tmpdir(), 'suaagenda-eval-'))
  const proc = spawn(
    exe,
    ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', `--window-size=${width},${height}`, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
  const port = await new Promise((resolve, reject) => {
    let buf = ''
    const timer = setTimeout(() => reject(new Error('Chrome não iniciou em 20s')), 20000)
    proc.stderr.on('data', (d) => {
      buf += d.toString()
      const m = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/)
      if (m) {
        clearTimeout(timer)
        resolve(Number(m[1]))
      }
    })
    proc.on('exit', () => reject(new Error('Chrome encerrou cedo')))
  })

  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const pageInfo = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(pageInfo.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = () => reject(new Error('falha ao conectar no Chrome'))
  })
  let nextId = 1
  const pending = new Map()
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })

  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 })
  await send('Page.enable')

  return {
    async goto(url, settleMs = 2500) {
      await send('Page.navigate', { url })
      await sleep(settleMs)
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
      return r.result.value
    },
    async close() {
      try {
        ws.close()
      } catch {
        // já fechado
      }
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
      else proc.kill('SIGKILL')
      await sleep(300)
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
      } catch {
        // o Windows pode segurar a pasta por alguns segundos; é só lixo temporário
      }
    }
  }
}
