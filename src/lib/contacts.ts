// Canais de atendimento do SuaAgenda. É o único lugar com esses dados: landing, painel do dono,
// tela de bloqueio e rodapé leem daqui.
export const SUPPORT_CONTACTS = {
  whatsapp: '88988941408',
  email: 'sistemaappbarbearia@gmail.com',
  instagramHandle: 'suaa.gendaapp'
} as const

export const whatsappUrl = (message?: string): string =>
  `https://wa.me/55${SUPPORT_CONTACTS.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`

export const mailtoUrl = (subject?: string, body?: string): string => {
  const params = [subject ? `subject=${encodeURIComponent(subject)}` : '', body ? `body=${encodeURIComponent(body)}` : '']
    .filter(Boolean)
    .join('&')
  return `mailto:${SUPPORT_CONTACTS.email}${params ? `?${params}` : ''}`
}

export const instagramUrl = (): string => `https://www.instagram.com/${SUPPORT_CONTACTS.instagramHandle}/`

// 88988941408 -> (88) 98894-1408
export const whatsappDisplay = (): string => {
  const d = SUPPORT_CONTACTS.whatsapp
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const instagramDisplay = (): string => `@${SUPPORT_CONTACTS.instagramHandle}`
