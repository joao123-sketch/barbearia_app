// Service worker mínimo: habilita a instalação do app (PWA) sem cachear dados.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
