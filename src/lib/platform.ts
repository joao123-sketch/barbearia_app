import { DEFAULT_MONTHLY_FEE } from './mockData'

// Configurações de cobrança da plataforma: mensalidade, chave PIX, QR Code e contato.
// Ficam no banco (tabela platform_settings) e só o administrador altera, pelo painel geral.
export interface PlatformSettings {
  monthly_fee: number
  pix_key: string
  pix_name: string
  pix_bank: string
  pix_qrcode: string
  contact_whatsapp: string // recebe os comprovantes de pagamento
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  monthly_fee: DEFAULT_MONTHLY_FEE,
  pix_key: '',
  pix_name: '',
  pix_bank: '',
  pix_qrcode: '',
  contact_whatsapp: ''
}
