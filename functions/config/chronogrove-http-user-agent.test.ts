import { describe, it, expect } from 'vitest'

import pkg from '../package.json' with { type: 'json' }
import { chronogroveHttpUserAgent } from './chronogrove-http-user-agent.js'

describe('chronogroveHttpUserAgent', () => {
  it('is chronogrove/<version> from package.json', () => {
    expect(chronogroveHttpUserAgent).toBe(`chronogrove/${pkg.version}`)
  })
})
