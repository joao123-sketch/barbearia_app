// Regras do link de agendamento (parte pura, sem acesso ao banco). Usada pelo app, pelo worker e conferida contra o banco
// nos testes: se a lista mudar aqui, a migração 0020 e o teste avisam.

// Nomes que já são páginas ou pastas do app: um negócio com esse link ficaria inalcançável
export const RESERVED_SLUGS = [
  'login', 'cadastrar', 'cadastro', 'redefinir-senha', 'admin', 'master', 'superadmin',
  'b', 'assets', 'api', 'icon', 'manifest', 'landing', 'sw'
] as const

export const isReservedSlug = (slug: string): boolean => (RESERVED_SLUGS as readonly string[]).includes(slug)

// "Barbearia Corte & Bem!" -> "barbearia-corte-bem" (sem acento, sem espaço, 2 a 60 caracteres)
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50)
    .replace(/-$/, '')
}

// Link sugerido para novos cadastros: tira as palavras genéricas do ramo ("Lava Jato Brilho" -> "brilho"),
// que só deixam o link comprido. Se sobrar pouco, volta ao nome completo.
const GENERIC_WORDS = new Set(['lava', 'jato', 'lavajato', 'lavarapido', 'rapido'])
export function slugifyBusiness(name: string): string {
  const words = slugify(name).split('-').filter((w) => !GENERIC_WORDS.has(w))
  const short = words.join('-').replace(/^-|-$/g, '')
  return short.length >= 3 ? short : slugify(name)
}

// Link curto que o dono envia: sem o "/b/", que continua funcionando nos links antigos.
export const shortLink = (origin: string, slug: string): string => `${origin}/${slug}`

// Texto pronto para o dono mandar no WhatsApp, com o nome do negócio.
export const shareMessage = (businessName: string, link: string): string =>
  `Agende seu horário na ${businessName} pelo link: ${link}`
