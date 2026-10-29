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
  grace_days: number // dias de atraso até o bloqueio
  invoice_lead_days: number // com quantos dias de antecedência a fatura é criada
  reminder_offsets: number[] // dias em relação ao vencimento com aviso: negativo = antes, 0 = no dia, positivo = atraso
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  monthly_fee: DEFAULT_MONTHLY_FEE,
  pix_key: '',
  pix_name: '',
  pix_bank: '',
  pix_qrcode: '',
  contact_whatsapp: '',
  grace_days: 10,
  invoice_lead_days: 7,
  reminder_offsets: [-5, -1, 0, 1, 3, 5, 7, 9, 11, 14, 18, 24, 30]
}

// Atendimento ao dono (suporte do SuaAgenda): WhatsApp do João
export const SUPPORT_WHATSAPP = '88988941408'
// Endereço oficial do app (aparece no link de agendamento mostrado no cadastro)
export const SITE_URL = 'https://barbearia-app.sistemaappbarbearia.workers.dev'
export const SUPPORT_EMAIL = 'sistemaappbarbearia@gmail.com'
