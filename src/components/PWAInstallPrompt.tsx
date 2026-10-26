import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles, CheckCircle2, Menu } from 'lucide-react'

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
  const [isSafari, setIsSafari] = useState(true)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)
  // O cabeçalho do painel usa desfoque (backdrop-filter), que prende elementos "fixed" dentro dele.
  // Por isso o aviso é desenhado na raiz do tema (mantém as cores), fora do cabeçalho.
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortalTarget((anchorRef.current?.closest('[data-shop-theme]') as HTMLElement | null) ?? document.body)
  }, [])

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
    // No iPhone, Chrome/Firefox/Edge não instalam apps: só o Safari
    setIsSafari(!/crios|fxios|edgios|opios/.test(userAgent))

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
      <span ref={anchorRef} className="hidden" />
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
          className={`flex items-center gap-1.5 p-2 min-[420px]:px-3 min-[420px]:py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden min-[420px]:inline">Baixar App</span>
        </button>
      )}

      {/* Banner de fixação flutuante no rodapé para clientes mobile */}
      {variant === 'banner' && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-fade-in">
          <div className="relative p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-amber-500/30 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 backdrop-blur-xl">
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
      {showIOSModal && portalTarget && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-300">
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

            {isIOS && !isSafari && (
              <p className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                Atenção: no iPhone a instalação só funciona pelo <strong>Safari</strong>. Copie este link e abra no Safari para continuar.
              </p>
            )}

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {isIOS
                ? 'Siga os passos abaixo no Safari. O app fica na tela inicial, com a logo e o nome do estabelecimento, e não ocupa espaço de memória:'
                : 'Siga os passos abaixo para adicionar o app na tela inicial do seu celular:'}
            </p>

            <div className="space-y-3">
              {(isIOS
                ? [
                    {
                      title: (
                        <>
                          Toque nas <Menu className="w-4 h-4 text-amber-400 inline" /> três barras horizontais
                        </>
                      ),
                      text: 'Ficam ao lado da barra de endereço, na parte de baixo da tela do Safari.'
                    },
                    {
                      title: (
                        <>
                          Toque em <Share2 className="w-4 h-4 text-amber-400 inline" /> Compartilhar
                        </>
                      ),
                      text: 'Aparece no menu que abriu.'
                    },
                    {
                      title: (
                        <>
                          Arraste para baixo e escolha <PlusSquare className="w-4 h-4 text-amber-400 inline" /> “Adicionar à Tela de Início”
                        </>
                      ),
                      text: 'Role a lista com o dedo até encontrar a opção com o ícone de quadrado com um sinal de +.'
                    },
                    {
                      title: <>Toque em “Adicionar”</>,
                      text: 'No canto superior direito. Pronto: o ícone já está na sua tela inicial.'
                    }
                  ]
                : [
                    {
                      title: (
                        <>
                          Toque no menu <span className="font-black">⋮</span> do navegador
                        </>
                      ),
                      text: 'Fica no canto superior direito (Chrome) ou na barra de endereço.'
                    },
                    {
                      title: (
                        <>
                          Escolha <PlusSquare className="w-4 h-4 text-amber-400 inline" /> “Instalar app” ou “Adicionar à tela inicial”
                        </>
                      ),
                      text: 'Depois confirme em “Instalar” ou “Adicionar”.'
                    }
                  ]
              ).map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-200 mb-0.5 leading-snug">{step.title}</p>
                    <p className="text-slate-400">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {isIOS && (
              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                Dica: no iPhone o app instalado guarda o login separado do Safari. Na primeira vez que abrir, entre com seu
                e-mail ou WhatsApp e a senha. Depois disso o login fica salvo.
              </p>
            )}

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:brightness-105 transition-all"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      , portalTarget)}

      {/* Notificação de Sucesso */}
      {installSuccess && portalTarget && createPortal(
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 backdrop-blur-md shadow-2xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-white">Aplicativo instalado com sucesso!</p>
            <p>O ícone agora está disponível na sua tela de aplicativos.</p>
          </div>
        </div>
      , portalTarget)}
    </>
  )
}
