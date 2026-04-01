import type { ChronogroveThemeId } from './chronogroveTheme'

/** Numeric colors for Three.js, keyed by app theme (for GroveScene / backdrops). */
export function scenePaletteThree(theme: ChronogroveThemeId) {
  if (theme === 'starry-night') {
    return {
      background: 0x060816,
      fog: 0x050714,
      branchDeep: [0.07, 0.1, 0.18] as [number, number, number],
      branchTip: [0.12, 0.3, 0.55] as [number, number, number],
      alive: [0.3, 0.56, 0.8] as [number, number, number],
      spore: 0xf0c030,
    }
  }

  return {
    background: 0x050806,
    fog: 0x030504,
    branchDeep: [0.06, 0.1, 0.08] as [number, number, number],
    branchTip: [0.15, 0.42, 0.32] as [number, number, number],
    alive: [0.2, 0.62, 0.52] as [number, number, number],
    spore: 0x6bc4a0,
  }
}
