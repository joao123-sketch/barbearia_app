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
export function applyShopPwa(slug: string, name: string, app: 'client' | 'admin') {
  const query = app === 'admin' ? '?app=admin' : ''
  setLink('manifest', `/manifest/${slug}.webmanifest${query}`)
  setLink('apple-touch-icon', `/icon/${slug}`)
  setMeta('apple-mobile-web-app-title', name.length > 14 ? name.slice(0, 14).trim() : name)
  document.title = app === 'admin' ? `${name} · Painel` : name
}

// Telas sem negócio definido (entrar, cadastrar...): app genérico
export function applyDefaultPwa(pathname: string) {
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/cadastr')
  setLink('manifest', isAdminArea ? '/manifest-admin.json' : '/manifest.json')
  setLink('apple-touch-icon', '/apple-touch-icon.png')
  setMeta('apple-mobile-web-app-title', 'SuaAgenda')
  document.title = isAdminArea ? 'Painel | SuaAgenda' : 'SuaAgenda | Agendamento Online'
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
