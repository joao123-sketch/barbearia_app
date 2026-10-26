import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { Barbershop, Service } from '../types'
import { buildShopTheme, getModeFor, shopThemeAttrs, useShopChrome } from '../lib/shopTheme'
import { checkPassword, findAccount, resetPassword, startSession } from '../lib/auth'
import { BarberOnboarding } from './BarberOnboarding'

interface BarberAuthProps {
  barbershops: Barbershop[]
  onSelectBarbershop: (shop: Barbershop) => void
  onRegisterBarbershop: (shop: Barbershop, services: Service[], initialTeamNames?: string[]) => void
}

type View = 'login' | 'forgot' | 'register'

const inputClass =
  'w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm'
const primaryClass =
  'w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer'

export const BarberAuth: React.FC<BarberAuthProps> = ({
  barbershops,
  onSelectBarbershop,
  onRegisterBarbershop
}) => {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Recuperação de senha
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryFound, setRecoveryFound] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [recovered, setRecovered] = useState(false)

  // Entrada e recuperação usam o visual neutro; o cadastro muda conforme o estilo escolhido
  const neutralMode = getModeFor('neutro', null)
  useShopChrome('neutro', neutralMode)

  const goTo = (next: View) => {
    setError('')
    setView(next)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const account = findAccount(identifier)
    if (!account || !(await checkPassword(account, password))) {
      setError('Usuário ou senha incorretos.')
      return
    }
    const shop = barbershops.find((s) => s.id === account.shop_id)
    if (!shop) {
      setError('Não encontramos o negócio desta conta neste aparelho.')
      return
    }
    startSession(account)
    onSelectBarbershop(shop)
    navigate('/admin')
  }

  // Provisório: sem servidor de e-mail ainda, a troca de senha acontece na hora.
  // Com o banco (Supabase Auth) isto vira o envio do link por e-mail.
  const handleForgotEmail = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!findAccount(recoveryEmail)) {
      setError('Não encontramos uma conta com este e-mail.')
      return
    }
    setRecoveryFound(true)
  }

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('Crie uma senha com no mínimo 6 caracteres.')
      return
    }
    if (await resetPassword(recoveryEmail, newPassword)) setRecovered(true)
  }

  if (view === 'register') {
    return (
      <BarberOnboarding
        onRegisterBarbershop={onRegisterBarbershop}
        onBack={() => goTo('login')}
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
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">
            {view === 'login' ? 'Entrar' : 'Recuperar senha'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {view === 'login'
              ? 'Acesse o painel do seu negócio.'
              : 'Informe o e-mail da sua conta para criar uma nova senha.'}
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
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmail(identifier.includes('@') ? identifier : '')
                    setRecoveryFound(false)
                    setRecovered(false)
                    goTo('forgot')
                  }}
                  className="mt-2 text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Esqueci a senha
                </button>
              </div>
            </div>

            <button type="submit" className={primaryClass}>
              <span>Entrar</span>
              <ArrowRight className="w-4 h-4" />
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

            {recovered ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm text-slate-200 font-semibold">Senha alterada!</p>
                <button type="button" onClick={() => goTo('login')} className={primaryClass}>
                  Voltar para o login
                </button>
              </div>
            ) : !recoveryFound ? (
              <form onSubmit={handleForgotEmail} className="space-y-4 text-xs">
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
                <button type="submit" className={primaryClass}>
                  Continuar
                </button>
              </form>
            ) : (
              <form onSubmit={handleNewPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nova senha</span>
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button type="submit" className={primaryClass}>
                  Salvar nova senha
                </button>
              </form>
            )}

            {!recovered && (
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
