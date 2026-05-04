import type { GoodreadsRecentlyReadBook } from '../types/goodreads.js'

/**
 * Parse Goodreads `read_at` text for chronological sort.
 * Unparseable or missing values sort last when ordering most-recent-first.
 */
export const goodreadsReadAtToSortKey = (readAt: string | null | undefined): number => {
  if (readAt == null || readAt === '') {
    return Number.NEGATIVE_INFINITY
  }
  const ms = Date.parse(readAt)
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY
}

/** Most recently read first; entries without a usable `readAt` sort to the end. */
export const sortGoodreadsRecentlyReadBooksByReadAtDesc = (
  books: GoodreadsRecentlyReadBook[],
): GoodreadsRecentlyReadBook[] =>
  [...books].sort(
    (a, b) => goodreadsReadAtToSortKey(b.readAt) - goodreadsReadAtToSortKey(a.readAt),
  )
