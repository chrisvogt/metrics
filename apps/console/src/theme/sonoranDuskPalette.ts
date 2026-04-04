/**
 * Shared primitives for the Sonoran Dusk WebGL scene (auth backdrop).
 * Dashboard CSS variables live in `styles/themes/sonoran-dusk.css` (warm sunset accent,
 * violet base — derived from these colors).
 */

export const sonoranDuskThree = {
  void: 0x08061a,
  fog: 0x180c10,
  sun: 0xffa858,
  sunGlow: 0xe87030,
  sunHalo: 0x803020,
  dust: 0xc08848,
  star: 0xb0a8d0,
} as const

/** Silhouette layers back → front (canvas fills). */
export const sonoranDuskSilhouetteHex = [
  '#1a1030',
  '#140c28',
  '#0e0820',
  '#0a0618',
  '#060410',
] as const

/** Sky dome linear gradient (canvas 0 → 1 matches `SonoranDuskScene` `makeSkyTex`). */
export const sonoranDuskSkyGradientStops: ReadonlyArray<readonly [number, string]> = [
  [0, '#08061a'],
  [0.2, '#141040'],
  [0.38, '#381838'],
  [0.48, '#882828'],
  [0.54, '#c85820'],
  [0.58, '#e88838'],
  [0.62, '#c85520'],
  [0.72, '#501515'],
  [0.85, '#1a0a10'],
  [1, '#100810'],
] as const

/** Warm haze strips in `makeSkyTex` (`rgba(200,120,60,α)`). */
export const sonoranDuskHazeRgb = { r: 200, g: 120, b: 60 } as const
