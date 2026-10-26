// Worker do Cloudflare: gera, para cada negócio, o manifesto e o ícone do aplicativo instalável
// (nome e logo do próprio estabelecimento). Todo o resto é servido como arquivos estáticos do site.

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

// Muda quando a logo muda: o celular baixa o ícone novo em vez de reaproveitar o antigo
function logoVersion(value?: string | null): string {
  if (!value) return '0'
  const step = Math.max(1, Math.floor(value.length / 512))
  let h = 5381
  for (let i = 0; i < value.length; i += step) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0
  return h.toString(36) + value.length.toString(36)
}

async function loadShop(slug: string): Promise<Shop | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/public_barbershops?slug=eq.${encodeURIComponent(slug)}&select=name,slug,logo_url,style_preset&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  if (!res.ok) return null
  const rows = (await res.json()) as Shop[]
  return rows[0] ?? null
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

async function manifestResponse(slug: string, app: 'client' | 'admin') {
  const shop = await loadShop(slug)
  if (!shop) return new Response('Not found', { status: 404 })

  const logo = shop.logo_url ? parseDataUrl(shop.logo_url) : null
  const color = PRESET_COLORS[shop.style_preset ?? 'neutro'] ?? '#090a0f'
  const isAdmin = app === 'admin'

  const icons = logo
    ? [
        { src: `/icon/${shop.slug}?v=${logoVersion(shop.logo_url)}`, sizes: '192x192 512x512', type: logo.type, purpose: 'any' }
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
  const logo = shop?.logo_url ? parseDataUrl(shop.logo_url) : null

  if (logo) {
    return new Response(logo.bytes, {
      headers: { 'content-type': logo.type, 'cache-control': 'public, max-age=300' }
    })
  }
  if (shop?.logo_url && /^https?:\/\//.test(shop.logo_url)) return Response.redirect(shop.logo_url, 302)

  // Sem logo cadastrada: ícone padrão do app
  return env.ASSETS.fetch(new Request(new URL('/icon-512.png', request.url)))
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const manifest = url.pathname.match(/^\/manifest\/([a-z0-9-]+)\.webmanifest$/)
    if (manifest) return manifestResponse(manifest[1], url.searchParams.get('app') === 'admin' ? 'admin' : 'client')

    const icon = url.pathname.match(/^\/icon\/([a-z0-9-]+)$/)
    if (icon) return iconResponse(icon[1], request, env)

    return env.ASSETS.fetch(request)
  }
}
