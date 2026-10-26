import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Sessão do Supabase Auth (fica guardada no navegador e renova sozinha)
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
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
  const { data: email } = await supabase.rpc('email_for_login', { p_identifier: identifier.trim() })
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
