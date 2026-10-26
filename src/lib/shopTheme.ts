import { useEffect } from 'react'
import type { CSSProperties } from 'react'

export type ThemeMode = 'dark' | 'light'

type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>

const AMBER: Scale = { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' }
const VIOLET: Scale = { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' }
const CYAN: Scale = { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' }
const BLUE: Scale = { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' }
const EMERALD: Scale = { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' }
const PINK: Scale = { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843', 950: '#500724' }
const STONE: Scale = { 50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917', 950: '#0c0a09' }
// Minimalista no claro: destaque quase preto (a inversão automática ficaria clara demais)
const MONO_LIGHT: Scale = { 50: '#0f172a', 100: '#1e293b', 200: '#1e293b', 300: '#1e293b', 400: '#334155', 500: '#334155', 600: '#1e293b', 700: '#0f172a', 800: '#cbd5e1', 900: '#e2e8f0', 950: '#f1f5f9' }
const MONO: Scale = { 50: '#ffffff', 100: '#f8fafc', 200: '#f1f5f9', 300: '#f1f5f9', 400: '#e2e8f0', 500: '#cbd5e1', 600: '#94a3b8', 700: '#64748b', 800: '#475569', 900: '#334155', 950: '#1e293b' }

// Superfícies (o "slate" do app): [fundo, cartões, campos/bordas, bordas fortes].
interface ThemeDef {
  accent: Scale
  accentLight?: Scale
  dark: [string, string, string, string]
  light: [string, string, string, string]
}

const THEMES: Record<string, ThemeDef> = {
  elegante: { accent: AMBER, dark: ['#090a0f', '#12151f', '#1c202d', '#2b3040'], light: ['#faf6ec', '#ffffff', '#efe6d0', '#dfd2b0'] },
  sofisticado: { accent: VIOLET, dark: ['#0d0a14', '#17121f', '#231c30', '#352b47'], light: ['#f6f2fb', '#ffffff', '#e7ddf4', '#d3c3e8'] },
  moderno: { accent: CYAN, dark: ['#060b12', '#0e1620', '#18222f', '#27364a'], light: ['#effafc', '#ffffff', '#d3eef3', '#b3dde6'] },
  minimalista: { accent: MONO, accentLight: MONO_LIGHT, dark: ['#0a0a0a', '#141414', '#1f1f1f', '#2e2e2e'], light: ['#f5f5f5', '#ffffff', '#e5e5e5', '#d0d0d0'] },
  simples: { accent: EMERALD, dark: ['#08100e', '#101b18', '#192a25', '#27403a'], light: ['#f4f8f6', '#ffffff', '#dfece6', '#c4d9cf'] },
  rosa: { accent: PINK, dark: ['#140a10', '#1f121a', '#2e1a26', '#452838'], light: ['#fff1f6', '#ffffff', '#fbdce8', '#f3bfd3'] },
  azul: { accent: BLUE, dark: ['#070b16', '#0e1424', '#172038', '#26324f'], light: ['#eff4fc', '#ffffff', '#d9e4f7', '#bccfee'] },
  neutro: { accent: STONE, dark: ['#0f0e0d', '#1a1816', '#262320', '#38342f'], light: ['#f6f1ea', '#ffffff', '#e9e1d5', '#d6cab9'] }
}

// Modo inicial de cada estilo (o cliente ainda pode alternar claro/escuro).
export const DEFAULT_MODE: Record<string, ThemeMode> = {
  elegante: 'dark',
  sofisticado: 'dark',
  moderno: 'dark',
  minimalista: 'dark',
  azul: 'dark',
  simples: 'light',
  rosa: 'light',
  neutro: 'light'
}

// Personalidade de cada estilo além das cores: tipografia, arredondamento e layout do topo.
interface Look {
  font: string
  heading?: string
  radius: [string, string, string, string] // lg, xl, 2xl, 3xl
  hero: 'left' | 'center'
  caps?: boolean // títulos em maiúsculas
  flat?: boolean // sem sombras
}

const SERIF = "'Playfair Display', Georgia, serif"
const DM = "'DM Sans', system-ui, sans-serif"
const POPPINS = "'Poppins', system-ui, sans-serif"
const GROTESK = "'Space Grotesk', system-ui, sans-serif"

const SOFT: Look['radius'] = ['0.75rem', '1rem', '1.5rem', '2rem']
const BASE: Look['radius'] = ['0.5rem', '0.75rem', '1rem', '1.5rem']
const SHARP: Look['radius'] = ['0.125rem', '0.25rem', '0.375rem', '0.5rem']
const SMALL: Look['radius'] = ['0.25rem', '0.375rem', '0.5rem', '0.75rem']

const LOOKS: Record<string, Look> = {
  elegante: { font: DM, heading: SERIF, radius: SMALL, hero: 'left', caps: true },
  sofisticado: { font: DM, heading: SERIF, radius: BASE, hero: 'center' },
  moderno: { font: GROTESK, radius: SHARP, hero: 'left', caps: true },
  minimalista: { font: DM, radius: SHARP, hero: 'left', flat: true },
  simples: { font: DM, radius: BASE, hero: 'left', flat: true },
  rosa: { font: POPPINS, radius: SOFT, hero: 'center' },
  azul: { font: POPPINS, radius: SMALL, hero: 'left' },
  neutro: { font: DM, heading: SERIF, radius: SOFT, hero: 'center', flat: true }
}

export function getLook(presetId: string | undefined): Look {
  return LOOKS[presetId || 'elegante'] ?? LOOKS.elegante
}

// Atributos que ligam as regras de tipografia/sombra do index.css
export function shopThemeAttrs(presetId: string | undefined, mode?: ThemeMode) {
  const look = getLook(presetId)
  return {
    'data-shop-theme': presetId || 'elegante',
    'data-shop-mode': mode ?? 'dark',
    'data-shop-caps': look.caps ? 'true' : 'false',
    'data-shop-flat': look.flat ? 'true' : 'false'
  }
}

// Cores de sinalização (verde, vermelho, azul...) escurecidas no modo claro para o texto continuar legível.
const SEMANTIC_LIGHT: Record<string, string> = {
  '--color-emerald-300': '#047857', '--color-emerald-400': '#047857', '--color-emerald-500': '#059669',
  '--color-green-400': '#15803d', '--color-green-500': '#16a34a',
  '--color-rose-300': '#be123c', '--color-rose-400': '#be123c', '--color-rose-500': '#e11d48',
  '--color-red-300': '#b91c1c', '--color-red-400': '#b91c1c', '--color-red-500': '#dc2626',
  '--color-blue-300': '#1d4ed8', '--color-blue-400': '#1d4ed8',
  '--color-sky-400': '#0369a1', '--color-indigo-400': '#4338ca', '--color-indigo-500': '#4f46e5',
  '--color-orange-300': '#c2410c', '--color-orange-400': '#c2410c',
  // fundos escuros de avisos (ex.: bg-rose-950/20) viram tons claros no modo claro
  '--color-rose-900': '#ffe4e6', '--color-rose-950': '#fff1f2', '--color-red-900': '#fee2e2', '--color-red-950': '#fef2f2',
  '--color-emerald-900': '#d1fae5', '--color-emerald-950': '#ecfdf5', '--color-blue-900': '#dbeafe', '--color-blue-950': '#eff6ff',
  '--color-green-900': '#dcfce7', '--color-green-950': '#f0fdf4',
  '--color-pink-400': '#be185d', '--color-purple-400': '#7e22ce', '--color-cyan-400': '#0e7490'
}

// Tons de texto do app (slate 50..600) em cada modo.
const TEXT_DARK = { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569' }
const TEXT_LIGHT = { 50: '#0f172a', 100: '#1e293b', 200: '#334155', 300: '#475569', 400: '#64748b', 500: '#66758b', 600: '#8794a8' }

// Em modo claro os tons "claros" do destaque ficam escuros para dar contraste no fundo branco.
function accentFor(scale: Scale, mode: ThemeMode, light?: Scale): Scale {
  if (mode === 'dark') return scale
  if (light) return light
  return {
    50: scale[950], 100: scale[900], 200: scale[900], 300: scale[800], 400: scale[700],
    500: scale[700], 600: scale[800], 700: scale[800], 800: scale[200], 900: scale[100], 950: scale[50]
  }
}

export function getModeFor(presetId: string | undefined, override: ThemeMode | null): ThemeMode {
  return override ?? DEFAULT_MODE[presetId || 'elegante'] ?? 'dark'
}

/**
 * Variáveis CSS que recolorem o app inteiro (Tailwind v4 lê as cores de var(--color-*)).
 * Com `accentOnly` só a cor de destaque muda (usado no painel, que tem o próprio claro/escuro).
 */
export function buildShopTheme(presetId: string | undefined, mode: ThemeMode, accentOnly = false): CSSProperties {
  const def = THEMES[presetId || 'elegante'] ?? THEMES.elegante
  const vars: Record<string, string> = {}
  for (const [step, hex] of Object.entries(accentFor(def.accent, mode, def.accentLight))) {
    vars[`--color-amber-${step}`] = hex
    vars[`--color-yellow-${step}`] = hex
  }
  if (!accentOnly) {
    const [bg, card, line, line2] = def[mode]
    for (const [step, hex] of Object.entries(mode === 'dark' ? TEXT_DARK : TEXT_LIGHT)) {
      vars[`--color-slate-${step}`] = hex
    }
    vars['--color-slate-950'] = bg
    vars['--color-slate-900'] = card
    vars['--color-slate-800'] = line
    vars['--color-slate-700'] = line2
    vars['--color-white'] = mode === 'dark' ? '#ffffff' : '#0f172a'
    if (mode === 'light') Object.assign(vars, SEMANTIC_LIGHT)

    const look = getLook(presetId)
    vars['--shop-font'] = look.font
    vars['--shop-heading'] = look.heading ?? look.font
    const [lg, xl, xl2, xl3] = look.radius
    vars['--radius-lg'] = lg
    vars['--radius-xl'] = xl
    vars['--radius-2xl'] = xl2
    vars['--radius-3xl'] = xl3
  }
  return vars as CSSProperties
}

export function shopBackground(presetId: string | undefined, mode: ThemeMode): string {
  return (THEMES[presetId || 'elegante'] ?? THEMES.elegante)[mode][0]
}

// Pinta o fundo do navegador (overscroll e barra de status no celular) com a cor do estilo.
export function useShopChrome(presetId: string | undefined, mode: ThemeMode) {
  useEffect(() => {
    const color = shopBackground(presetId, mode)
    const prevBody = document.body.style.backgroundColor
    document.body.style.backgroundColor = color
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const prevMeta = meta?.content
    if (meta) meta.content = color
    return () => {
      document.body.style.backgroundColor = prevBody
      if (meta && prevMeta) meta.content = prevMeta
    }
  }, [presetId, mode])
}
