// PIX "copia e cola" (BR Code estático) com o valor já preenchido, para o QR Code mudar conforme a mensalidade de cada conta.

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`

const crc16 = (payload: string) => {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// O BR Code aceita só letras sem acento, números e espaço nos textos
const clean = (text: string, max: number) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, max)

// CPF/CNPJ digitado com pontos e traço vira só números; e-mail e chave aleatória ficam como estão
export function normalizePixKey(key: string): string {
  const k = key.trim()
  if (/^[\d.\-/\s]+$/.test(k) && /[.\-/]/.test(k)) return k.replace(/\D/g, '')
  return k
}

export function buildPixPayload(opts: { key: string; name: string; amount: number; city?: string }): string {
  const account = tlv('00', 'br.gov.bcb.pix') + tlv('01', normalizePixKey(opts.key))
  const body =
    tlv('00', '01') +
    tlv('01', '11') +
    tlv('26', account) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', opts.amount.toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', clean(opts.name, 25) || 'SUAAGENDA') +
    tlv('60', clean(opts.city ?? 'BRASIL', 15) || 'BRASIL') +
    tlv('62', tlv('05', '***')) +
    '6304'
  return body + crc16(body)
}
