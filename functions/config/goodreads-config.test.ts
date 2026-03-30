import { describe, expect, it } from 'vitest'

import {
  GOODREADS_AI_READ_SHELF_MAX_PAGES,
  GOODREADS_AI_READ_SHELF_PER_PAGE,
  GOODREADS_BOOKS_TO_DISPLAY,
  GOODREADS_BOOKS_TO_FETCH,
} from './goodreads-config.js'

describe('goodreads-config', () => {
  it('sizes widget fetch above display so failed lookups can still fill the widget', () => {
    expect(GOODREADS_BOOKS_TO_DISPLAY).toBe(30)
    expect(GOODREADS_BOOKS_TO_FETCH).toBe(35)
    expect(GOODREADS_BOOKS_TO_FETCH).toBeGreaterThan(GOODREADS_BOOKS_TO_DISPLAY)
  })

  it('exports AI read-shelf pagination caps', () => {
    expect(GOODREADS_AI_READ_SHELF_PER_PAGE).toBe(200)
    expect(GOODREADS_AI_READ_SHELF_MAX_PAGES).toBe(10)
  })
})
