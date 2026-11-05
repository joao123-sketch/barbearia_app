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
