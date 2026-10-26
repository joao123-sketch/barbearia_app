import React, { useState, useEffect } from 'react'
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PWAInstallPromptProps {
  variant?: 'banner' | 'button' | 'compact'
  buttonText?: string
  className?: string
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  variant = 'button',
  buttonText = 'Instalar Aplicativo',
  className = ''
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)

  useEffect(() => {
    // Verifica se já está instalado (standalone)
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    setIsStandalone(isAppStandalone)

    // Detecta se é iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // Escuta evento do Android/Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isStandalone) {
      alert('O aplicativo já está instalado no seu aparelho!')
      return
    }

    if (isIOS) {
      setShowIOSModal(true)
      return
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallSuccess(true)
        setDeferredPrompt(null)
      }
    } else {
      // Caso o navegador não tenha disparado o prompt ainda (ex: Safari Mac ou Chrome Desktop),
      // abrimos instruções amigáveis
      setShowIOSModal(true)
    }
  }

  // Se já estiver rodando como App nativo
  if (isStandalone) {
    return null
  }

  return (
    <>
      {/* Botão de instalação estilizado */}
      {variant === 'button' && (
        <button
          onClick={handleInstallClick}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg active:scale-95 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-amber-500/20 hover:shadow-amber-500/35 hover:brightness-105 cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 animate-bounce" />
          <span>{buttonText}</span>
        </button>
      )}

      {/* Variante Compacta (Pílula discreta no cabeçalho) */}
      {variant === 'compact' && (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Baixar App</span>
        </button>
      )}

      {/* Banner de fixação flutuante no rodapé para clientes mobile */}
      {variant === 'banner' && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-fade-in">
          <div className="relative p-3.5 rounded-2xl bg-gradient-to-r from-[#171a26] to-[#1e2333] border border-amber-500/30 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 backdrop-blur-xl">
            <button
              onClick={() => setDismissed(true)}
              className="absolute -top-2 -right-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full border border-slate-700 text-xs shadow-md"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/30 shrink-0">
                <Sparkles className="w-5 h-5 text-slate-950" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">Instalar na Tela Inicial</p>
                <p className="text-[11px] text-slate-400">Acesso rápido sem precisar digitar link</p>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shrink-0 transition-transform active:scale-95 shadow-md shadow-amber-500/20"
            >
              Instalar
            </button>
          </div>
        </div>
      )}

      {/* Modal Guiado para iPhone (iOS) e navegadores sem suporte direto */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12151f] border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Instalar no seu Celular</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Siga os 2 passos rápidos para adicionar este aplicativo direto na tela de início do seu celular (não ocupa espaço de memória):
            </p>

            <div className="space-y-4">
              {/* Passo 1 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-200 mb-0.5 flex items-center gap-1.5">
                    Toque no botão <Share2 className="w-4 h-4 text-amber-400 inline" /> Compartilhar
                  </p>
                  <p className="text-slate-400">
                    No Safari (iPhone) fica na barra inferior. No Chrome, fica no menu de 3 pontinhos.
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-200 mb-0.5 flex items-center gap-1.5">
                    Escolha <PlusSquare className="w-4 h-4 text-amber-400 inline" /> "Adicionar à Tela de Início"
                  </p>
                  <p className="text-slate-400">
                    Role a lista para baixo até encontrar a opção com ícone quadrado e o sinal de mais (+).
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:brightness-105 transition-all"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}

      {/* Notificação de Sucesso */}
      {installSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 backdrop-blur-md shadow-2xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-white">Aplicativo instalado com sucesso!</p>
            <p>O ícone agora está disponível na sua tela de aplicativos.</p>
          </div>
        </div>
      )}
    </>
  )
}
