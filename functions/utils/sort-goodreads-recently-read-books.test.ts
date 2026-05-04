import { describe, it, expect } from 'vitest'
import {
  goodreadsReadAtToSortKey,
  sortGoodreadsRecentlyReadBooksByReadAtDesc,
} from './sort-goodreads-recently-read-books.js'
import type { GoodreadsRecentlyReadBook } from '../types/goodreads.js'

const minimalBook = (overrides: Partial<GoodreadsRecentlyReadBook>): GoodreadsRecentlyReadBook => ({
  categories: [],
  cdnMediaURL: '',
  id: 'x',
  infoLink: '',
  mediaDestinationPath: 'books/x.jpg',
  smallThumbnail: '',
  thumbnail: '',
  ...overrides,
})

describe('goodreadsReadAtToSortKey', () => {
  it('returns NEGATIVE_INFINITY for empty or unparseable strings', () => {
    expect(goodreadsReadAtToSortKey(undefined)).toBe(Number.NEGATIVE_INFINITY)
    expect(goodreadsReadAtToSortKey('')).toBe(Number.NEGATIVE_INFINITY)
    expect(goodreadsReadAtToSortKey('not a date')).toBe(Number.NEGATIVE_INFINITY)
  })

  it('parses ISO and common Goodreads-style dates', () => {
    expect(goodreadsReadAtToSortKey('2023-01-01')).toBe(Date.parse('2023-01-01'))
    expect(goodreadsReadAtToSortKey('2023/01/02')).toBe(Date.parse('2023/01/02'))
  })
})

describe('sortGoodreadsRecentlyReadBooksByReadAtDesc', () => {
  it('orders most recently read first and pushes missing readAt to the end', () => {
    const a = minimalBook({ id: 'a', readAt: '2023-01-01', title: 'Old' })
    const b = minimalBook({ id: 'b', readAt: '2024-06-15', title: 'New' })
    const c = minimalBook({ id: 'c', title: 'No date' })
    const sorted = sortGoodreadsRecentlyReadBooksByReadAtDesc([a, c, b])
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a', 'c'])
  })

  it('does not mutate the input array', () => {
    const input: GoodreadsRecentlyReadBook[] = [
      minimalBook({ id: '1', readAt: '2022-01-01' }),
      minimalBook({ id: '2', readAt: '2023-01-01' }),
    ]
    const copy = [...input]
    sortGoodreadsRecentlyReadBooksByReadAtDesc(input)
    expect(input).toEqual(copy)
  })
})
