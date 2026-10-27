import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { clearOwnerCache } from './ownerCache'
import { normalizeEmail } from './phone'

// Sessão do Supabase Auth (fica guardada no navegador e renova sozinha)
// Lê a sessão guardada no aparelho de forma imediata: quem já estava logado não vê tela de carregamento
function readStoredSession(): Session | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && /^sb-.+-auth-token$/.test(key)) {
        const value = JSON.parse(localStorage.getItem(key) || 'null')
        if (value?.user) return value as Session
      }
    }
  } catch {
    // armazenamento bloqueado
  }
  return null
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => readStoredSession())
  const [ready, setReady] = useState(true)

  useEffect(() => {
    // Confirma com o servidor em segundo plano (renova o acesso se precisar)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, ready }
}

// "Usuário" pode ser o e-mail ou o WhatsApp: o banco devolve o e-mail da conta
export async function signIn(identifier: string, password: string) {
  const { data: email } = await supabase.rpc('email_for_login', { p_identifier: identifier.includes('@') ? normalizeEmail(identifier) : identifier.trim() })
  if (!email) throw new Error('Invalid login credentials')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password })
  if (error) throw error
  // Com a confirmação de e-mail desligada a sessão já vem pronta
  if (!data.session) throw new Error('Não foi possível iniciar a sessão. Tente entrar com o e-mail e a senha.')
}

export async function signOut() {
  clearOwnerCache()
  await supabase.auth.signOut()
}

// Envia o e-mail com o link para criar uma nova senha
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/redefinir-senha`
  })
  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// Já existe conta com este WhatsApp ou e-mail? (para sugerir "Entrar")
export async function accountExists(phone?: string, email?: string): Promise<boolean> {
  const { data } = await supabase.rpc('account_exists', { p_phone: phone || null, p_email: email || null })
  return Boolean(data)
}

// Já usou o teste grátis? (o cadastro avisa antes de criar a conta)
export async function trialAlreadyUsed(phone: string): Promise<boolean> {
  const { data } = await supabase.rpc('trial_used', { p_phone: phone })
  return Boolean(data)
}

// Confere a senha atual (entrando de novo) antes de mudar dados sensíveis
async function confirmCurrentPassword(currentPassword: string) {
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  if (!email) throw new Error('not_authenticated')
  const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (error) throw new Error('Senha atual incorreta.')
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await confirmCurrentPassword(currentPassword)
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// Devolve true se o e-mail já foi trocado, ou false se o Supabase pediu confirmação pelo novo e-mail
export async function changeEmail(currentPassword: string, newEmail: string): Promise<boolean> {
  await confirmCurrentPassword(currentPassword)
  const { data, error } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() })
  if (error) throw error
  return !data.user?.new_email
}

export async function currentEmail(): Promise<string | undefined> {
  const { data } = await supabase.auth.getUser()
  return data.user?.email
}
