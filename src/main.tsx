import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/pwa'

registerServiceWorker()

// iPhone com o app instalado: garante um espaço mínimo para o relógio, mesmo se o sistema não informar
if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) {
  document.documentElement.style.setProperty('--ios-min-top', '47px')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
