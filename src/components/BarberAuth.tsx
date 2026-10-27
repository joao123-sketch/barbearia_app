import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, User, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { buildShopTheme, getModeFor, shopThemeAttrs, useShopChrome } from '../lib/shopTheme'
import { requestPasswordReset, signIn } from '../lib/auth'
import { friendlyError } from '../lib/db'
import { BarberOnboarding } from './BarberOnboarding'
import { PasswordInput } from './PasswordInput'

interface BarberAuthProps {
  hasSession: boolean
  hasShop: boolean
  shopLoading: boolean
  onRegistered: () => Promise<void>
}

type View = 'login' | 'forgot' | 'register'

const inputClass =
  'w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm'
const primaryClass =
  'w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60'

export const BarberAuth: React.FC<BarberAuthProps> = ({ hasSession, hasShop, shopLoading, onRegistered }) => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/admin'

  const [view, setView] = useState<View>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Recuperação de senha
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)

  // Entrada e recuperação usam o visual neutro; o cadastro muda conforme o estilo escolhido
  const neutralMode = getModeFor('neutro', null)
  useShopChrome('neutro', neutralMode)

  // Quem já está logado vai direto ao painel; logado sem negócio completa o cadastro
  useEffect(() => {
    if (!hasSession || shopLoading) return
    if (hasShop) navigate(next, { replace: true })
    else setView('register')
  }, [hasSession, hasShop, shopLoading, navigate, next])

  const goTo = (target: View) => {
    setError('')
    setView(target)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(identifier, password)
      // o efeito acima leva ao painel assim que a sessão e o negócio carregam
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await requestPasswordReset(recoveryEmail)
      setRecoverySent(true)
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  // Já logado: vai direto ao painel durante a própria renderização (sem exibir o formulário de entrada)
  if (hasSession && shopLoading) {
    return <div style={buildShopTheme('neutro', neutralMode)} className="min-h-screen bg-slate-950" />
  }
  if (hasSession && hasShop) return <Navigate to={next} replace />

  if (view === 'register') {
    return (
      <BarberOnboarding
        onBack={() => goTo('login')}
        onRegistered={async () => {
          await onRegistered()
          navigate('/admin')
        }}
      />
    )
  }

  return (
    <div
      {...shopThemeAttrs('neutro')}
      style={buildShopTheme('neutro', neutralMode)}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 select-none"
    >
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-black text-white tracking-tight">
            {view === 'login' ? 'Entrar' : 'Recuperar senha'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {view === 'login'
              ? 'Acesse o painel do seu negócio.'
              : 'Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.'}
          </p>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs">{error}</div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Usuário</span>
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="E-mail ou WhatsApp"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Senha</span>
                </label>
                <PasswordInput
                  required
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  inputClassName={inputClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmail(identifier.includes('@') ? identifier : '')
                    setRecoverySent(false)
                    goTo('forgot')
                  }}
                  className="mt-2 text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Esqueci a senha
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy} className={primaryClass}>
              <span>{busy ? 'Entrando...' : 'Entrar'}</span>
              {!busy && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => goTo('register')}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm cursor-pointer active:scale-95 transition-all"
              >
                Cadastrar conta
              </button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs">{error}</div>
            )}

            {recoverySent ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm text-slate-200 font-semibold">Confira seu e-mail</p>
                <p className="text-xs text-slate-400">
                  Se este e-mail tiver uma conta, enviamos um link para criar a nova senha. Veja também a caixa de spam.
                </p>
                <button type="button" onClick={() => goTo('login')} className={primaryClass}>
                  Voltar para o login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>E-mail da conta</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seuemail@gmail.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button type="submit" disabled={busy} className={primaryClass}>
                  {busy ? 'Enviando...' : 'Enviar link'}
                </button>
              </form>
            )}

            {!recoverySent && (
              <button
                type="button"
                onClick={() => goTo('login')}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
