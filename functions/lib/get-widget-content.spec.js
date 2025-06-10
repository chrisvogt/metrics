const { describe, it, expect, vi } = require('vitest')

// Mock the individual widget content getters
vi.mock('./get-github-widget-content', () => ({
  default: vi.fn(() => Promise.resolve({ type: 'github', data: {} }))
}))

vi.mock('./get-goodreads-widget-content', () => ({
  default: vi.fn(() => Promise.resolve({ type: 'goodreads', data: {} }))
}))

vi.mock('./get-instagram-widget-content', () => ({
  default: vi.fn(() => Promise.resolve({ type: 'instagram', data: {} }))
}))

vi.mock('./get-spotify-widget-content', () => ({
  default: vi.fn(() => Promise.resolve({ type: 'spotify', data: {} }))
}))

vi.mock('./get-steam-widget-content', () => ({
  default: vi.fn(() => Promise.resolve({ type: 'steam', data: {} }))
}))

const { getWidgetContent, validWidgetIds } = require('./get-widget-content')

describe('get-widget-content', () => {
  describe('validWidgetIds', () => {
    it('should contain all supported widget types', () => {
      expect(validWidgetIds).toEqual([
        'github',
        'goodreads',
        'instagram',
        'spotify',
        'steam'
      ])
    })
  })

  describe('getWidgetContent', () => {
    it('should throw error for invalid widget type', async () => {
      await expect(getWidgetContent('invalid'))
        .rejects
        .toThrow('Unrecognized widget type: invalid')
    })

    it('should call correct handler for valid widget type', async () => {
      const result = await getWidgetContent('spotify')
      expect(result).toEqual({ type: 'spotify', data: {} })
    })
  })
}) 