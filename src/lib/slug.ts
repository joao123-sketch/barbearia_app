import { fetchPublicShopBySlug } from './db'
import { isReservedSlug, slugifyBusiness } from './slugRules'

// Link livre a partir do nome: se já existir (ou for reservado), acrescenta -2, -3… e por fim um sufixo aleatório
export async function findFreeSlug(name: string): Promise<string> {
  const base = slugifyBusiness(name) || 'meu-negocio'
  const taken = async (slug: string) => isReservedSlug(slug) || Boolean(await fetchPublicShopBySlug(slug).catch(() => null))
  if (base.length >= 2 && !(await taken(base))) return base
  for (let n = 2; n <= 9; n++) {
    const candidate = `${base}-${n}`
    if (!(await taken(candidate))) return candidate
  }
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}
