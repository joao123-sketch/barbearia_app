import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { buildShopTheme, getModeFor, shopThemeAttrs, useShopChrome } from '../lib/shopTheme'
import { updatePassword, useSession } from '../lib/auth'
import { friendlyError } from '../lib/db'

// Página aberta pelo link do e-mail de recuperação: o Supabase já entrega uma sessão temporária
export const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const { session, ready } = useSession()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const mode = getModeFor('neutro', null)
  useShopChrome('neutro', mode)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Crie uma senha com no mínimo 6 caracteres.')
      return
    }
    setSaving(true)
    try {
      await updatePassword(password)
      navigate('/admin')
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      {...shopThemeAttrs('neutro')}
      style={buildShopTheme('neutro', mode)}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 select-none"
    >
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-3">
          <img src="/logo-js.png" alt="SuaAgenda" className="w-24 h-24 rounded-3xl mx-auto shadow-lg" />
          <h1 className="text-2xl font-black text-white tracking-tight">Nova senha</h1>
          <p className="text-xs text-slate-400">Escolha uma nova senha para entrar na sua conta.</p>
        </div>

        {!ready ? null : !session ? (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl text-center text-sm">
            <p className="text-slate-300">Este link expirou ou já foi usado.</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black cursor-pointer"
            >
              Voltar para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl text-xs">
            {error && <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400">{error}</div>}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
