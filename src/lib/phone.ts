// WhatsApp padronizado: só dígitos, sem o 55 do Brasil (DDD + número, 10 ou 11 dígitos).
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 12 && digits.startsWith('55') ? digits.slice(2) : digits
}

// Número no formato que o wa.me exige (com 55)
export function toWaNumber(value: string): string {
  return `55${normalizePhone(value)}`
}

// Máscara "(DD) 99999-9999" para campos de digitação.
// Apagar um caractere da máscara (parêntese, espaço ou hífen) não muda os dígitos; sem tratar isso, a máscara
// recoloca o caractere e o campo "trava" (no iPhone só apagava até o hífen). Nesse caso apaga o dígito anterior.
export function formatPhoneInput(raw: string, previous: string): string {
  let digits = normalizePhone(raw)
  const prevDigits = normalizePhone(previous)
  if (raw.length < previous.length && digits === prevDigits) digits = digits.slice(0, -1)
  digits = digits.slice(0, 11)

  if (digits.length > 6) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length > 0) return `(${digits}`
  return ''
}
