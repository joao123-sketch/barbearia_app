// Contas do barbeiro neste aparelho. Provisório: troca por Supabase Auth quando o banco entrar.
export interface BarberAccount {
  email: string
  phone: string
  password_hash: string
  owner_name: string
  shop_id: string
  shop_slug: string
}

const ACCOUNTS_KEY = 'barber_accounts'
const SESSION_KEY = 'barber_current_user'

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function loadAccounts(): BarberAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveAccounts(list: BarberAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
}

export const onlyDigits = (v: string) => v.replace(/\D/g, '')

export function findAccount(identifier: string): BarberAccount | undefined {
  const raw = identifier.trim().toLowerCase()
  const digits = onlyDigits(raw)
  return loadAccounts().find(
    (a) => a.email.toLowerCase() === raw || (digits.length >= 10 && a.phone === digits)
  )
}

export async function createAccount(account: Omit<BarberAccount, 'password_hash'>, password: string) {
  const list = loadAccounts()
  list.push({ ...account, password_hash: await hashPassword(password) })
  saveAccounts(list)
}

export async function checkPassword(account: BarberAccount, password: string): Promise<boolean> {
  return account.password_hash === (await hashPassword(password))
}

export async function resetPassword(email: string, newPassword: string): Promise<boolean> {
  const list = loadAccounts()
  const acc = list.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
  if (!acc) return false
  acc.password_hash = await hashPassword(newPassword)
  saveAccounts(list)
  return true
}

export function startSession(account: BarberAccount) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ phone: account.phone, email: account.email, owner_name: account.owner_name, shop_id: account.shop_id, shop_slug: account.shop_slug })
  )
}

export function getSession(): { shop_id: string } | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    return s?.shop_id ? s : null
  } catch {
    return null
  }
}

export function endSession() {
  localStorage.removeItem(SESSION_KEY)
}
