// Nomes que já são páginas do app: um negócio com esse link ficaria inalcançável
const RESERVED = new Set(['login', 'cadastrar', 'cadastro', 'admin', 'master', 'superadmin', 'b', 'redefinir-senha', 'assets', 'api'])

// "Barbearia Corte & Bem!" -> "barbearia-corte-bem" (sem acento, sem espaço, 2 a 60 caracteres)
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50)
    .replace(/-$/, '')
}

// Link livre a partir do nome: se já existir (ou for reservado), acrescenta -2, -3… e por fim um sufixo aleatório
export async function findFreeSlug(name: string): Promise<string> {
  const { fetchPublicShopBySlug } = await import('./db')
  const base = slugify(name) || 'meu-negocio'
  const taken = async (slug: string) => RESERVED.has(slug) || Boolean(await fetchPublicShopBySlug(slug).catch(() => null))
  if (base.length >= 2 && !(await taken(base))) return base
  for (let n = 2; n <= 9; n++) {
    const candidate = `${base}-${n}`
    if (!(await taken(candidate))) return candidate
  }
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}
