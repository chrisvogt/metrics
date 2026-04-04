import json from 'highlight.js/lib/languages/json'
import { createLowlight } from 'lowlight'

/** Highlight.js JSON grammar only — keeps the client bundle smaller than `lowlight/common`. */
export const jsonLowlight = createLowlight({ json })
