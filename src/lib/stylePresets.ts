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

export const STYLE_PRESETS: Record<ShopStylePreset, StylePresetConfig> = {
  elegante: {
    id: 'elegante',
    name: 'Mais Elegante',
    subtitle: 'Luxury Gold & Visual Clássico',
    targetAudience: 'Para barbearias de alto padrão, visagismo e ambientes sofisticados.',
    icon: '👑',
    swatches: ['#F59E0B', '#D97706', '#78350F'],
    primaryButton: 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-300',
    primarySolid: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-500/40',
    accentBg: 'bg-amber-500/20',
    accentBgLight: 'bg-amber-500/10',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentHover: 'hover:border-amber-500/60 hover:text-amber-300',
    shadowGlow: 'shadow-amber-500/20',
    bannerGradient: 'from-amber-950/40 via-slate-900 to-[#0A0D14]',
    headerPill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    calendarHighlight: 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
  },
  moderno: {
    id: 'moderno',
    name: 'Mais Moderno',
    subtitle: 'Neon Cyan & High-Tech Futurista',
    targetAudience: 'Para barbearias urbanas, cortes degradê, freestyle e público jovem.',
    icon: '⚡',
    swatches: ['#06B6D4', '#0EA5E9', '#10B981'],
    primaryButton: 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-black shadow-lg shadow-cyan-500/25 hover:from-cyan-300 hover:to-emerald-300',
    primarySolid: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-500/40',
    accentBg: 'bg-cyan-500/20',
    accentBgLight: 'bg-cyan-500/10',
    accentBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accentHover: 'hover:border-cyan-500/60 hover:text-cyan-300',
    shadowGlow: 'shadow-cyan-500/20',
    bannerGradient: 'from-cyan-950/40 via-slate-900 to-[#0A0D14]',
    headerPill: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    calendarHighlight: 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-cyan-500/30'
  },
  minimalista: {
    id: 'minimalista',
    name: 'Minimalista',
    subtitle: 'Clean Mono & Titânio Contemporâneo',
    targetAudience: 'Design clean, linhas retas, conceito escandinavo e foco no essencial.',
    icon: '⚪',
    swatches: ['#F8FAFC', '#94A3B8', '#334155'],
    primaryButton: 'bg-gradient-to-r from-white to-slate-200 text-slate-950 font-black shadow-lg shadow-white/10 hover:from-slate-100 hover:to-white',
    primarySolid: 'bg-white hover:bg-slate-200 text-slate-950 font-bold',
    accentText: 'text-slate-100',
    accentBorder: 'border-slate-600',
    accentBg: 'bg-slate-800',
    accentBgLight: 'bg-slate-850',
    accentBadge: 'bg-slate-800 text-slate-200 border-slate-700',
    accentHover: 'hover:border-slate-400 hover:text-white',
    shadowGlow: 'shadow-white/10',
    bannerGradient: 'from-slate-900 via-slate-900 to-[#0A0D14]',
    headerPill: 'bg-slate-800 text-slate-200 border-slate-700',
    calendarHighlight: 'bg-white text-slate-950 border-slate-300 shadow-white/20'
  },
  simples: {
    id: 'simples',
    name: 'Mais Simples',
    subtitle: 'Tradicional Amarelo & Acolhedor',
    targetAudience: 'Visual direto ao ponto, familiar e sem complicações.',
    icon: '✂️',
    swatches: ['#EAB308', '#CA8A04', '#451A03'],
    primaryButton: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black shadow-lg shadow-yellow-500/25 hover:from-yellow-400 hover:to-amber-400',
    primarySolid: 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold',
    accentText: 'text-yellow-400',
    accentBorder: 'border-yellow-500/40',
    accentBg: 'bg-yellow-500/20',
    accentBgLight: 'bg-yellow-500/10',
    accentBadge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    accentHover: 'hover:border-yellow-500/60 hover:text-yellow-300',
    shadowGlow: 'shadow-yellow-500/20',
    bannerGradient: 'from-yellow-950/35 via-slate-900 to-[#0A0D14]',
    headerPill: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    calendarHighlight: 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-yellow-500/30'
  },
  rosa: {
    id: 'rosa',
    name: 'Mais Rosa (Meninas / Beauty)',
    subtitle: 'Rose Gold & Pink Glamour',
    targetAudience: 'Para salões, estúdios de beleza, barbearias unissex e público feminino.',
    icon: '🌸',
    swatches: ['#EC4899', '#F43F5E', '#831843'],
    primaryButton: 'bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-300',
    primarySolid: 'bg-pink-500 hover:bg-pink-400 text-white font-bold',
    accentText: 'text-pink-400',
    accentBorder: 'border-pink-500/40',
    accentBg: 'bg-pink-500/20',
    accentBgLight: 'bg-pink-500/10',
    accentBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    accentHover: 'hover:border-pink-500/60 hover:text-pink-300',
    shadowGlow: 'shadow-pink-500/20',
    bannerGradient: 'from-pink-950/40 via-slate-900 to-[#0A0D14]',
    headerPill: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    calendarHighlight: 'bg-pink-500 text-white border-pink-400 shadow-pink-500/30'
  },
  azul: {
    id: 'azul',
    name: 'Azul (Homens / Executivo)',
    subtitle: 'Royal Blue & Estética Executiva',
    targetAudience: 'Visual masculino marcante, estética de clube executivo e esportivo.',
    icon: '🌊',
    swatches: ['#2563EB', '#0284C7', '#172554'],
    primaryButton: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-400',
    primarySolid: 'bg-blue-600 hover:bg-blue-500 text-white font-bold',
    accentText: 'text-blue-400',
    accentBorder: 'border-blue-500/40',
    accentBg: 'bg-blue-500/20',
    accentBgLight: 'bg-blue-500/10',
    accentBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    accentHover: 'hover:border-blue-500/60 hover:text-blue-300',
    shadowGlow: 'shadow-blue-500/20',
    bannerGradient: 'from-blue-950/40 via-slate-900 to-[#0A0D14]',
    headerPill: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    calendarHighlight: 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30'
  }
}

export function getStylePreset(presetId?: ShopStylePreset): StylePresetConfig {
  if (presetId && STYLE_PRESETS[presetId]) {
    return STYLE_PRESETS[presetId]
  }
  return STYLE_PRESETS.elegante
}
