// Encurta o link de agendamento (is.gd, grátis e sem conta) para o dono copiar/enviar sem o endereço comprido.
// Se o serviço falhar ou demorar, devolve o próprio link: o botão nunca fica sem resposta.
const CACHE_PREFIX = 'short_link:'

export async function shortenLink(url: string): Promise<string> {
  if (!/^https:\/\/(?!localhost)/.test(url)) return url
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + url)
    if (cached) return cached
  } catch { /* sem armazenamento: segue sem cache */ }
  try {
    const res = await fetch(`https://is.gd/create.php?format=json&logstats=0&url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000)
    })
    const data = (await res.json()) as { shorturl?: string }
    if (data.shorturl && /^https:\/\/is\.gd\/[\w-]+$/.test(data.shorturl)) {
      try { localStorage.setItem(CACHE_PREFIX + url, data.shorturl) } catch { /* ok */ }
      return data.shorturl
    }
  } catch { /* rede ou limite do serviço */ }
  return url
}
