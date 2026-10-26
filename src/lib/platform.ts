import { DEFAULT_MONTHLY_FEE, DEFAULT_PIX_KEY, DEFAULT_PIX_NAME, DEFAULT_PIX_QRCODE } from './mockData'

// Configurações de cobrança da plataforma, editadas no painel geral (/master).
// Provisório no aparelho; com o banco de dados passam a valer para todos.
export interface PlatformSettings {
  monthly_fee: number
  pix_key: string
  pix_name: string
  pix_bank: string
  pix_qrcode: string
  contact_whatsapp: string // recebe os comprovantes de pagamento
}

const KEY = 'barber_platform_settings'

const DEFAULTS: PlatformSettings = {
  monthly_fee: DEFAULT_MONTHLY_FEE,
  pix_key: DEFAULT_PIX_KEY,
  pix_name: DEFAULT_PIX_NAME,
  pix_bank: 'Banco Inter',
  pix_qrcode: DEFAULT_PIX_QRCODE,
  contact_whatsapp: ''
}

export function getPlatformSettings(): PlatformSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    const legacyFee = Number(localStorage.getItem('barber_master_base_fee'))
    return {
      ...DEFAULTS,
      ...(legacyFee > 0 ? { monthly_fee: legacyFee } : {}),
      ...saved
    }
  } catch {
    return DEFAULTS
  }
}

export function savePlatformSettings(settings: PlatformSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
}
