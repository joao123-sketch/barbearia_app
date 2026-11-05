import type { BusinessType } from '../types'

export const BUSINESS_TYPES: BusinessType[] = ['barbearia', 'salao', 'lavajato']

// Aceita o valor de ?tipo= do link do cadastro (ex.: /cadastrar?tipo=lavajato); qualquer outro valor é ignorado
export function parseBusinessType(value: string | null | undefined): BusinessType | null {
  const v = (value ?? '').trim().toLowerCase()
  return (BUSINESS_TYPES as string[]).includes(v) ? (v as BusinessType) : null
}

// Vocabulário que muda entre barbearia, salão de beleza e lava-jato.
export function getTerms(type?: BusinessType) {
  if (type === 'lavajato') {
    return {
      business: 'lava-jato',
      Business: 'Lava-jato',
      nameLabel: 'Nome do Lava-jato',
      namePlaceholder: 'Ex: Lava-jato Brilho Total',
      professional: 'funcionário',
      Professional: 'Funcionário',
      anyProfessional: 'Qualquer funcionário',
      defaultSlogan: 'Seu carro limpo e protegido, sem fila.',
      serviceExample: 'Ex: Lavagem simples, Lavagem completa, Polimento...',
      notesLabel: 'Modelo do veículo (opcional)',
      notesPlaceholder: 'Ex: Onix, Hilux, CG 160',
      notesEmoji: '🚗',
      notesWhatsApp: 'Veículo',
      teamHint: 'Cadastre os seus funcionários na aba Equipe: cada um tem a sua agenda, e dá para atender vários carros ao mesmo tempo.'
    }
  }
  const salon = type === 'salao'
  return {
    business: salon ? 'salão' : 'barbearia',
    Business: salon ? 'Salão' : 'Barbearia',
    nameLabel: salon ? 'Nome do Salão' : 'Nome da Barbearia',
    namePlaceholder: salon ? 'Ex: Studio Bela Vida' : 'Ex: Barbearia Black Diamond',
    professional: salon ? 'profissional' : 'barbeiro',
    Professional: salon ? 'Profissional' : 'Barbeiro',
    anyProfessional: salon ? 'Qualquer profissional' : 'Qualquer barbeiro',
    defaultSlogan: salon ? 'Beleza e cuidado do seu jeito.' : 'Tradição, estilo e o melhor corte da região.',
    serviceExample: salon ? 'Ex: Corte feminino, Escova, Manicure...' : 'Ex: Corte degradê, Barba completa...',
    notesLabel: `Observações para o ${salon ? 'profissional' : 'barbeiro'} (opcional)`,
    notesPlaceholder: 'Ex: Primeira vez aqui, alguma preferência?',
    notesEmoji: '📝',
    notesWhatsApp: 'Observação',
    teamHint: 'Se atende com equipe, cadastre os profissionais na aba Equipe.'
  }
}
