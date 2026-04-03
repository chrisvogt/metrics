import type { ChronogroveThemeId } from '@/theme/chronogroveTheme'

/** Single source for theme names and descriptions across Settings, menu, and sign-in. */
export const CHRONOGROVE_THEME_INFO: Record<
  ChronogroveThemeId,
  { label: string; menuLabel: string; blurb: string }
> = {
  'sonoran-dusk': {
    label: 'Sonoran Dusk',
    menuLabel: 'Sonoran Dusk',
    blurb: 'Desert sunset silhouettes, warm sky, and the cinematic login scene.',
  },
  'starry-night': {
    label: 'Starry Night',
    menuLabel: 'Starry Night (original)',
    blurb: 'Legacy indigo sky, gold accents, and the original brush-stroke canvas.',
  },
}
