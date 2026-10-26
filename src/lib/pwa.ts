// Painel do barbeiro e página do cliente são apps instaláveis separados.
export function applyManifestForPath(pathname: string) {
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/login')
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (manifest) manifest.href = isAdmin ? '/manifest-admin.json' : '/manifest.json'
  const title = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
  if (title) title.content = isAdmin ? 'Painel Barbeiro' : 'Barbearia'
  if (isAdmin) document.title = 'Painel do Barbeiro | BarberApp'
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
