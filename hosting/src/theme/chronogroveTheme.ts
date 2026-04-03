export const CHRONOGROVE_THEMES = ['sonoran-dusk', 'starry-night'] as const

export type ChronogroveThemeId = (typeof CHRONOGROVE_THEMES)[number]

export const DEFAULT_THEME: ChronogroveThemeId = 'sonoran-dusk'

/** next-themes `storageKey` in `providers.tsx` — keep in sync. */
export const CHRONOGROVE_THEME_STORAGE_KEY = 'chronogrove-ui-theme'

export function isChronogroveTheme(value: unknown): value is ChronogroveThemeId {
  return typeof value === 'string' && (CHRONOGROVE_THEMES as readonly string[]).includes(value)
}

/** Coerce API or other unknown values to a valid Chronogrove theme id. */
export function normalizeChronogroveThemeId(value: unknown): ChronogroveThemeId {
  return isChronogroveTheme(value) ? value : DEFAULT_THEME
}
