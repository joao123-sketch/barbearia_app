// Cada negócio tem o seu aplicativo instalável: o cliente abre direto no agendamento e o dono no painel.
// O manifesto e o ícone (logo do estabelecimento) são gerados pelo worker em /manifest e /icon.

function setLink(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
  link.removeAttribute('type') // o tipo (png/jpeg) varia conforme a logo
}

function setMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = name
    document.head.appendChild(meta)
  }
  meta.content = content
}

// Aponta o navegador para o app do negócio (nome e logo dele na tela inicial)
// Muda quando a logo muda: o celular baixa o ícone novo em vez de reaproveitar o antigo
function logoVersion(value?: string | null): string {
  if (!value) return '0'
  const step = Math.max(1, Math.floor(value.length / 512))
  let h = 5381
  for (let i = 0; i < value.length; i += step) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0
  return h.toString(36) + value.length.toString(36)
}

// Nome que o celular sugere ao instalar: o dono instala o "SuaAgenda"; o cliente, o nome do estabelecimento
// com as iniciais maiúsculas e sem espaços (ex.: "salão fique linda" -> "SalãoFiqueLinda").
// (mesma regra de worker/index.ts)
function installName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}

export function applyShopPwa(slug: string, name: string, app: 'client' | 'admin', logoUrl?: string | null) {
  const query = app === 'admin' ? '?app=admin' : ''
  // O servidor lê este cookie para já entregar a página do painel com o ícone e o nome do negócio
  if (app === 'admin') {
    try {
      document.cookie = `shop_slug=${slug}; path=/; max-age=31536000; samesite=lax`
    } catch {
      // cookies bloqueados: o app continua funcionando
    }
  }
  setLink('manifest', `/manifest/${slug}.webmanifest${query}`)
  const icon = `/icon/${slug}?v=${logoVersion(logoUrl)}`
  setLink('apple-touch-icon', icon)
  setLink('icon', icon)
  setMeta('apple-mobile-web-app-title', app === 'admin' ? 'SuaAgenda' : installName(name))
  document.title = app === 'admin' ? `${name} · Painel` : name
}

// Telas sem negócio definido (entrar, cadastrar...): app genérico
export function applyDefaultPwa(pathname: string) {
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/cadastr')
  setLink('manifest', isAdminArea ? '/manifest-admin.json' : '/manifest.json')
  setLink('apple-touch-icon', '/apple-touch-icon.png')
  // A logo da SuaAgenda aparece só como ícone da aba nas telas de entrada do dono
  const isSignIn = pathname.startsWith('/login') || pathname.startsWith('/cadastr') || pathname.startsWith('/redefinir')
  setLink('icon', isSignIn ? '/favicon-js.png' : '/icon-192.png')
  setMeta('apple-mobile-web-app-title', 'SuaAgenda')
  document.title = isSignIn
    ? 'SuaAgenda | Agenda online para barbearias e salões'
    : isAdminArea
      ? 'Painel | SuaAgenda'
      : 'SuaAgenda | Agendamento Online'
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
