/**
 * Goodreads widget configuration.
 * BOOKS_TO_DISPLAY: Number of books to store and show in the widget.
 * BOOKS_TO_FETCH: Goodreads `per_page` and how many reviews we resolve via Google Books.
 *   Must be larger than BOOKS_TO_DISPLAY: rows without ISBN, Google Books misses, and
 *   title-search fallbacks reduce the list before we slice to display count.
 */
export const GOODREADS_BOOKS_TO_DISPLAY = 30

/** Extra shelf rows beyond display so failures still yield a full widget. */
const GOODREADS_WIDGET_FETCH_BUFFER = 5

export const GOODREADS_BOOKS_TO_FETCH =
  GOODREADS_BOOKS_TO_DISPLAY + GOODREADS_WIDGET_FETCH_BUFFER

/**
 * Page size when paginating the entire "read" shelf for the AI summary only.
 * Goodreads allows up to 200 per page; larger pages mean fewer round trips.
 */
export const GOODREADS_AI_READ_SHELF_PER_PAGE = 200

/** Safety cap to avoid unbounded pagination if the API misbehaves. */
export const GOODREADS_AI_READ_SHELF_MAX_PAGES = 10
