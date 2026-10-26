// Deixa só o @ da pessoa, mesmo que ela cole o link do perfil com parâmetros
// (ex.: "https://instagram.com/maria?igsh=abc" ou "@maria?psln=xyz" viram "@maria").
export function normalizeInstagram(raw?: string | null): string {
  if (!raw) return ''
  let v = raw.trim()
  v = v.replace(/^https?:\/\//i, '').replace(/^(www\.)?(instagram\.com|instagr\.am)\//i, '')
  v = v.replace(/^@/, '')
  const user = v.split(/[/?#&\s]/)[0].replace(/[^A-Za-z0-9._]/g, '')
  return user ? `@${user.slice(0, 30)}` : ''
}
