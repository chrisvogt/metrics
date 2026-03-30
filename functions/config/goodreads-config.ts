/**
 * Goodreads widget configuration.
 * BOOKS_TO_FETCH: Number of books to fetch from Goodreads and process (Google Books API, thumbnails).
 *   Includes buffer for failures—some books may not be found or lack thumbnails.
 * BOOKS_TO_DISPLAY: Number of books to store and display in the widget.
 */
export const GOODREADS_BOOKS_TO_FETCH = 30
export const GOODREADS_BOOKS_TO_DISPLAY = 30

/**
 * Page size when paginating the entire "read" shelf for the AI summary only.
 * Goodreads allows up to 200 per page; larger pages mean fewer round trips.
 */
export const GOODREADS_AI_READ_SHELF_PER_PAGE = 200

/** Safety cap to avoid unbounded pagination if the API misbehaves. */
export const GOODREADS_AI_READ_SHELF_MAX_PAGES = 10
