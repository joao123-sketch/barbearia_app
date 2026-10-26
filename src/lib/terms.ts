import type { BusinessType } from '../types'

// Vocabulário que muda entre barbearia e salão de beleza.
export function getTerms(type?: BusinessType) {
  const salon = type === 'salao'
  return {
    business: salon ? 'salão' : 'barbearia',
    Business: salon ? 'Salão' : 'Barbearia',
    professional: salon ? 'profissional' : 'barbeiro',
    Professional: salon ? 'Profissional' : 'Barbeiro',
    anyProfessional: salon ? 'Qualquer profissional' : 'Qualquer barbeiro',
    defaultSlogan: salon ? 'Beleza e cuidado do seu jeito.' : 'Tradição, estilo e o melhor corte da região.',
    serviceExample: salon ? 'Ex: Corte feminino, Escova, Manicure...' : 'Ex: Corte degradê, Barba completa...'
  }
}
