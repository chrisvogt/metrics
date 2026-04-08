import '@testing-library/jest-dom/vitest'

import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Default 1000ms is tight for debounced username checks + async fetch under `test:coverage` on CI.
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
