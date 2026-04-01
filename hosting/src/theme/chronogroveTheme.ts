export const CHRONOGROVE_THEMES = ['dark-forest', 'starry-night'] as const

export type ChronogroveThemeId = (typeof CHRONOGROVE_THEMES)[number]

export const DEFAULT_THEME: ChronogroveThemeId = 'dark-forest'

export function isChronogroveTheme(value: unknown): value is ChronogroveThemeId {
  return typeof value === 'string' && (CHRONOGROVE_THEMES as readonly string[]).includes(value)
}
