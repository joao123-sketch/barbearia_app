// Worker do Cloudflare: gera, para cada negócio, o manifesto e o ícone do aplicativo instalável
// (nome e logo do próprio estabelecimento) e já entrega a página com esses dados no HTML, para o
// celular instalar com a logo certa mesmo antes do aplicativo carregar. Todo o resto é arquivo estático.

const SUPABASE_URL = 'https://jkahsamhmaijhfgjijfg.supabase.co'
// Chave pública (publishable): a proteção real está nas regras RLS do banco
const SUPABASE_KEY = 'sb_publishable_Pp50y6WaFzFqr0yVUKSx3g_qi5nZQOi'

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

interface Shop {
  name: string
  slug: string
  logo_url: string | null
  app_icon: string | null
  style_preset: string | null
}

// Cor de fundo/barra de cada estilo no modo em que ele abre (mantém igual a src/lib/shopTheme.ts)
const PRESET_COLORS: Record<string, string> = {
  elegante: '#090a0f',
  sofisticado: '#0d0a14',
  moderno: '#060b12',
  minimalista: '#0a0a0a',
  azul: '#070b16',
  simples: '#f4f8f6',
  rosa: '#fff1f6',
  neutro: '#f6f1ea'
}

// Caminhos de uma só parte que NÃO são a página de um negócio
const RESERVED = new Set(['login', 'cadastrar', 'cadastro', 'redefinir-senha', 'admin', 'master', 'superadmin'])

// Muda quando a logo muda: o celular baixa o ícone novo em vez de reaproveitar o antigo
// (mesma conta de src/lib/pwa.ts)
function logoVersion(value?: string | null): string {
  if (!value) return '0'
  const step = Math.max(1, Math.floor(value.length / 512))
  let h = 5381
  for (let i = 0; i < value.length; i += step) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0
  return h.toString(36) + value.length.toString(36)
}

async function loadShop(slug: string): Promise<Shop | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/public_barbershops?slug=eq.${encodeURIComponent(slug)}&select=name,slug,logo_url,app_icon,style_preset&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!res.ok) return null
    const rows = (await res.json()) as Shop[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

// "data:image/jpeg;base64,...." -> tipo e bytes
function parseDataUrl(value: string): { type: string; bytes: Uint8Array } | null {
  const match = value.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i)
  if (!match) return null
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { type: match[1], bytes }
}

// Ícone do app: o PNG quadrado quando existe, senão a própria logo
function pickIcon(shop: Shop) {
  const source = shop.app_icon ?? shop.logo_url
  return source ? parseDataUrl(source) : null
}

async function manifestResponse(slug: string, app: 'client' | 'admin') {
  const shop = await loadShop(slug)
  if (!shop) return new Response('Not found', { status: 404 })

  const icon = pickIcon(shop)
  const color = PRESET_COLORS[shop.style_preset ?? 'neutro'] ?? '#090a0f'
  const isAdmin = app === 'admin'
  const version = logoVersion(shop.logo_url)

  const icons = icon
    ? [
        { src: `/icon/${shop.slug}?v=${version}`, sizes: '192x192', type: icon.type, purpose: 'any' },
        { src: `/icon/${shop.slug}?v=${version}`, sizes: '512x512', type: icon.type, purpose: 'any' }
      ]
    : [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
      ]

  const manifest = {
    // Cliente abre direto no agendamento; dono abre no painel do negócio
    id: isAdmin ? '/admin' : `/b/${shop.slug}`,
    name: isAdmin ? `${shop.name} · Painel` : shop.name,
    short_name: shop.name.length > 12 ? shop.name.slice(0, 12).trim() : shop.name,
    description: isAdmin ? `Painel de gestão de ${shop.name}` : `Agende seu horário em ${shop.name}`,
    lang: 'pt-BR',
    start_url: isAdmin ? '/admin' : `/b/${shop.slug}`,
    scope: isAdmin ? '/admin' : `/b/${shop.slug}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: color,
    theme_color: color,
    icons
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  })
}

async function iconResponse(slug: string, request: Request, env: Env) {
  const shop = await loadShop(slug)
  const icon = shop ? pickIcon(shop) : null

  if (icon) {
    return new Response(icon.bytes, {
      headers: { 'content-type': icon.type, 'cache-control': 'public, max-age=300' }
    })
  }
  if (shop?.logo_url && /^https?:\/\//.test(shop.logo_url)) return Response.redirect(shop.logo_url, 302)

  // Sem logo cadastrada: ícone padrão do app
  return env.ASSETS.fetch(new Request(new URL('/icon-512.png', request.url)))
}

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

// Qual negócio esta página representa (null = página genérica do SuaAgenda)
function pageTarget(url: URL, request: Request): { slug: string; app: 'client' | 'admin' } | null {
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 'b' && parts[1] && parts.length === 2) return { slug: parts[1], app: 'client' }
  if (parts.length === 1 && !RESERVED.has(parts[0]) && !parts[0].includes('.')) return { slug: parts[0], app: 'client' }
  if (parts[0] === 'admin') {
    const slug = cookieValue(request, 'shop_slug')
    if (slug && /^[a-z0-9-]+$/.test(slug)) return { slug, app: 'admin' }
  }
  return null
}

// Coloca no HTML o manifesto, o ícone e o nome do negócio logo na primeira resposta
async function withShopHead(response: Response, shop: Shop, app: 'client' | 'admin') {
  const color = PRESET_COLORS[shop.style_preset ?? 'neutro'] ?? '#090a0f'
  const icon = pickIcon(shop) ? `/icon/${shop.slug}?v=${logoVersion(shop.logo_url)}` : null
  const manifest = `/manifest/${shop.slug}.webmanifest${app === 'admin' ? '?app=admin' : ''}`
  const title = app === 'admin' ? `${shop.name} · Painel` : shop.name
  const short = shop.name.length > 14 ? shop.name.slice(0, 14).trim() : shop.name

  const rewriter = new HTMLRewriter()
    .on('title', { element: (el) => void el.setInnerContent(title) })
    .on('link[rel="manifest"]', { element: (el) => void el.setAttribute('href', manifest) })
    .on('meta[name="apple-mobile-web-app-title"]', { element: (el) => void el.setAttribute('content', short) })
    .on('meta[name="theme-color"]', { element: (el) => void el.setAttribute('content', color) })
  if (icon) {
    rewriter
      .on('link[rel="apple-touch-icon"]', { element: (el) => void el.setAttribute('href', icon) })
      .on('link[rel="icon"]', {
        element: (el) => {
          el.setAttribute('href', icon)
          el.removeAttribute('type')
        }
      })
  }
  const out = rewriter.transform(response)
  const headers = new Headers(out.headers)
  headers.set('cache-control', 'no-cache')
  return new Response(out.body, { status: out.status, headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const manifest = url.pathname.match(/^\/manifest\/([a-z0-9-]+)\.webmanifest$/)
    if (manifest) return manifestResponse(manifest[1], url.searchParams.get('app') === 'admin' ? 'admin' : 'client')

    const icon = url.pathname.match(/^\/icon\/([a-z0-9-]+)$/)
    if (icon) return iconResponse(icon[1], request, env)

    const response = await env.ASSETS.fetch(request)
    const isHtml = (response.headers.get('content-type') ?? '').includes('text/html')
    if (request.method === 'GET' && isHtml) {
      const target = pageTarget(url, request)
      if (target) {
        const shop = await loadShop(target.slug)
        if (shop) return withShopHead(response, shop, target.app)
      }
    }
    return response
  }
}
