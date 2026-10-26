// WhatsApp padronizado: só dígitos, sem o 55 do Brasil (DDD + número, 10 ou 11 dígitos).
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 12 && digits.startsWith('55') ? digits.slice(2) : digits
}

// Número no formato que o wa.me exige (com 55)
export function toWaNumber(value: string): string {
  return `55${normalizePhone(value)}`
}
