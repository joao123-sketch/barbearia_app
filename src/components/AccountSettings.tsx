import React, { useEffect, useState } from 'react'
import { KeyRound, Mail, Phone, Check } from 'lucide-react'
import { changeEmail, changePassword, currentEmail } from '../lib/auth'
import { friendlyError } from '../lib/db'
import { INVALID_MOBILE_MESSAGE, formatPhoneInput, isValidEmail, isValidMobile, normalizeEmail, normalizePhone } from '../lib/phone'
import { PasswordInput } from './PasswordInput'

interface AccountSettingsProps {
  phone: string
  onChangePhone: (phone: string) => void
}

type Section = 'email' | 'phone' | 'password' | null

const field =
  'w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm'
const primary =
  'px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer active:scale-95 transition-all disabled:opacity-60'

const formatPhone = (raw: string) => {
  const d = normalizePhone(raw)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

// Dados de acesso: e-mail, WhatsApp e senha (pedem a senha atual quando é algo sensível)
export const AccountSettings: React.FC<AccountSettingsProps> = ({ phone, onChangePhone }) => {
  const [open, setOpen] = useState<Section>(null)
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    currentEmail().then((e) => setEmail(e ?? ''))
  }, [])

  const toggle = (section: Section) => {
    setOpen(open === section ? null : section)
    setError('')
    setDone('')
    setCurrentPassword('')
    setNewPassword('')
    setNewEmail('')
    setNewPhone('')
  }

  const run = async (action: () => Promise<string>) => {
    setError('')
    setDone('')
    setBusy(true)
    try {
      setDone(await action())
      setOpen(null)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  const saveEmail = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(newEmail)) {
      setError('Informe um e-mail válido.')
      return
    }
    run(async () => {
      const changed = await changeEmail(currentPassword, newEmail)
      if (changed) setEmail(newEmail.trim().toLowerCase())
      return changed
        ? 'E-mail alterado! Use o novo e-mail para entrar.'
        : 'Enviamos um link de confirmação para o novo e-mail. Abra o link para concluir a troca.'
    })
  }

  const savePhone = (e: React.FormEvent) => {
    e.preventDefault()
    const digits = normalizePhone(newPhone)
    if (!isValidMobile(digits)) {
      setError(INVALID_MOBILE_MESSAGE)
      return
    }
    run(async () => {
      onChangePhone(digits)
      return 'WhatsApp alterado! Use o novo número para entrar e para receber os contatos.'
    })
  }

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('A nova senha precisa ter no mínimo 6 caracteres.')
      return
    }
    run(async () => {
      await changePassword(currentPassword, newPassword)
      return 'Senha alterada com sucesso!'
    })
  }

  const row = (section: Exclude<Section, null>, icon: React.ReactNode, label: string, value: string) => (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-100 truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => toggle(section)}
        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer shrink-0"
      >
        {open === section ? 'Fechar' : 'Alterar'}
      </button>
    </div>
  )

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
      <div className="mb-1">
        <h4 className="font-bold text-sm text-white">Acesso à conta</h4>
        <p className="text-slate-400 text-[11px]">E-mail, WhatsApp e senha que você usa para entrar.</p>
      </div>

      {done && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{done}</span>
        </div>
      )}

      <div className="divide-y divide-slate-800">
        <div>
          {row('email', <Mail className="w-4 h-4" />, 'E-mail', email || '—')}
          {open === 'email' && (
            <form onSubmit={saveEmail} className="pb-4 space-y-2.5">
              <input
                type="email"
                required
                autoCapitalize="none"
                placeholder="Novo e-mail"
                value={newEmail}
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setNewEmail(normalizeEmail(e.target.value))}
                className={field}
              />
              <PasswordInput
                required
                autoComplete="current-password"
                placeholder="Sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                inputClassName={field}
              />
              {error && <p className="text-rose-400">{error}</p>}
              <button type="submit" disabled={busy} className={primary}>
                {busy ? 'Salvando...' : 'Salvar e-mail'}
              </button>
            </form>
          )}
        </div>

        <div>
          {row('phone', <Phone className="w-4 h-4" />, 'WhatsApp', formatPhone(phone))}
          {open === 'phone' && (
            <form onSubmit={savePhone} className="pb-4 space-y-2.5">
              <input
                type="tel"
                required
                placeholder="(11) 99999-9999"
                value={newPhone}
                onChange={(e) => {
                  const next = e.target.value
                  setNewPhone((prev) => formatPhoneInput(next, prev))
                }}
                className={field}
              />
              {error && <p className="text-rose-400">{error}</p>}
              <button type="submit" disabled={busy} className={primary}>
                {busy ? 'Salvando...' : 'Salvar WhatsApp'}
              </button>
            </form>
          )}
        </div>

        <div>
          {row('password', <KeyRound className="w-4 h-4" />, 'Senha', '••••••••')}
          {open === 'password' && (
            <form onSubmit={savePassword} className="pb-4 space-y-2.5">
              <PasswordInput
                required
                autoComplete="current-password"
                placeholder="Senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                inputClassName={field}
              />
              <PasswordInput
                required
                autoComplete="new-password"
                placeholder="Nova senha (mínimo 6 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                inputClassName={field}
              />
              {error && <p className="text-rose-400">{error}</p>}
              <button type="submit" disabled={busy} className={primary}>
                {busy ? 'Salvando...' : 'Salvar senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
