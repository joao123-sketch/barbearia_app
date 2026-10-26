import type { ShopStylePreset } from '../types'

export interface StylePresetConfig {
  id: ShopStylePreset
  name: string
  subtitle: string
  targetAudience: string
  icon: string
  swatches: string[]
  // Classes Tailwind para a UI
  primaryButton: string
  primarySolid: string
  accentText: string
  accentBorder: string
  accentBg: string
  accentBgLight: string
  accentBadge: string
  accentHover: string
  shadowGlow: string
  bannerGradient: string
  headerPill: string
  calendarHighlight: string
}

// Todas as cores vêm de variáveis CSS (ver shopTheme.ts): as classes são as mesmas
// para qualquer estilo e o tema troca a paleta inteira por baixo.
const SHARED = {
  primaryButton: 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-300',
  primarySolid: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
  accentText: 'text-amber-400',
  accentBorder: 'border-amber-500/40',
  accentBg: 'bg-amber-500/20',
  accentBgLight: 'bg-amber-500/10',
  accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  accentHover: 'hover:border-amber-500/60 hover:text-amber-300',
  shadowGlow: 'shadow-amber-500/20',
  bannerGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
  headerPill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  calendarHighlight: 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
}

type PresetInfo = Pick<StylePresetConfig, 'id' | 'name' | 'subtitle' | 'targetAudience' | 'icon' | 'swatches'>

const INFO: PresetInfo[] = [
  { id: 'neutro', name: 'Neutro', subtitle: 'Bege e areia, sereno e acolhedor', targetAudience: 'Serve para qualquer negócio: barbearia, salão, estética.', icon: '🤍', swatches: ['#F6F1EA', '#A8A29E', '#57534E'] },
  { id: 'simples', name: 'Simples', subtitle: 'Branco limpo com toque verde', targetAudience: 'Direto ao ponto, sem enfeite, fácil de ler.', icon: '🌿', swatches: ['#F4F8F6', '#34D399', '#059669'] },
  { id: 'rosa', name: 'Rosa', subtitle: 'Delicado, feminino e leve', targetAudience: 'Salões de beleza, manicure, estética e cabelo feminino.', icon: '🌸', swatches: ['#FFF1F6', '#F472B6', '#DB2777'] },
  { id: 'sofisticado', name: 'Sofisticado', subtitle: 'Grafite com ametista', targetAudience: 'Espaços premium, visagismo e atendimento exclusivo.', icon: '💎', swatches: ['#0D0A14', '#A78BFA', '#7C3AED'] },
  { id: 'elegante', name: 'Elegante', subtitle: 'Preto e dourado clássico', targetAudience: 'Barbearias tradicionais e ambientes de alto padrão.', icon: '👑', swatches: ['#090A0F', '#FBBF24', '#D97706'] },
  { id: 'moderno', name: 'Moderno', subtitle: 'Escuro com azul ciano', targetAudience: 'Público jovem, cortes degradê e ambiente urbano.', icon: '⚡', swatches: ['#060B12', '#22D3EE', '#0891B2'] },
  { id: 'azul', name: 'Azul', subtitle: 'Sóbrio e executivo', targetAudience: 'Passa confiança e profissionalismo.', icon: '🔷', swatches: ['#070B16', '#60A5FA', '#2563EB'] },
  { id: 'minimalista', name: 'Minimalista', subtitle: 'Preto e branco, sem cor', targetAudience: 'Design clean e foco total no essencial.', icon: '⚪', swatches: ['#0A0A0A', '#E2E8F0', '#64748B'] }
]

export const STYLE_PRESETS = Object.fromEntries(
  INFO.map((i) => [i.id, { ...i, ...SHARED }])
) as Record<ShopStylePreset, StylePresetConfig>

export const STYLE_PRESET_ORDER: ShopStylePreset[] = INFO.map((i) => i.id)

export function getStylePreset(presetId?: ShopStylePreset): StylePresetConfig {
  if (presetId && STYLE_PRESETS[presetId]) {
    return STYLE_PRESETS[presetId]
  }
  return STYLE_PRESETS.elegante
}
