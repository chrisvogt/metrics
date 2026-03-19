import type {
  GoogleBooksVolumeSubset,
} from './google-books.js'

export type GoodreadsNilObject = { nil?: string } | { _: unknown } | Record<string, unknown>

export type GoodreadsPossiblyNilString = string | GoodreadsNilObject | null | undefined

export interface GoodreadsActor {
  imageURL?: string
  link?: string
  name?: string
}

export interface GoodreadsAuthorSummary {
  averageRating?: string
  goodreadsID?: string
  imageURL?: string
  hasImageURL?: boolean
  smallImageURL?: string
  hasSmallImageURL?: boolean
  ratingsCount?: string
  textReviewCount?: string
  // Some upstream Goodreads XML shapes also include these fields (used by the sync fallback search).
  name?: string
  displayName?: string
  sortName?: string
}

export interface GoodreadsReviewBook {
  author?: GoodreadsAuthorSummary
  goodreadsID?: string
  link?: string
  title?: string
  isbn?: GoodreadsPossiblyNilString
  isbn13?: GoodreadsPossiblyNilString
}

export interface GoodreadsUserStatusBook {
  author: {
    about?: string
    displayName?: string
    name?: string
    sortName?: string
  }
  format?: string
  goodreadsID?: string
  isbn?: GoodreadsPossiblyNilString
  isbn13?: GoodreadsPossiblyNilString
  pageCount?: number
  publicationYear?: number
  publisher?: string
  sortTitle?: string
  title?: string
}

export interface GoodreadsReviewUpdate {
  actionText?: string
  actor?: GoodreadsActor
  book?: GoodreadsReviewBook
  link?: string
  rating?: number
  type: 'review' | string
  updated?: string
}

export interface GoodreadsUserStatusUpdate {
  actionText?: string
  book?: GoodreadsUserStatusBook
  created?: string
  imageURL?: string
  link?: string
  page?: number
  percent?: number
  type: 'userstatus' | string
  updated?: string
  userID?: string
}

export type GoodreadsUpdate = GoodreadsReviewUpdate | GoodreadsUserStatusUpdate

export interface GoodreadsProfile {
  name?: string
  username?: string
  link?: string
  imageURL?: string
  smallImageURL?: string
  website?: string
  joined?: string
  interests?: string
  favoriteBooks?: string
  friendsCount?: string
  readCount: number
  profileURL?: string
}

export interface GoodreadsRecentlyReadBookFromGoogle {
  book: GoogleBooksVolumeSubset
  rating?: string | null
  goodreadsDescription?: string | undefined
  isbn?: string | null | undefined
}

export interface GoodreadsRecentlyReadBook {
  authors?: string[]
  categories: string[]
  cdnMediaURL: string
  mediaDestinationPath: string
  description?: string
  id: string
  infoLink: string
  isbn?: string | null
  pageCount?: number
  previewLink?: string
  rating?: string | null
  smallThumbnail: string
  subtitle?: string
  thumbnail: string
  title?: string
}

export interface GoodreadsReviewListRawReview {
  read_at?: unknown
  book?: unknown
  rating?: unknown
  [key: string]: unknown
}

export interface GoodreadsReviewListBookSource {
  isbn: string
  rating: string
  goodreadsDescription?: string
  title?: string
  authorName?: string
}

export interface GoodreadsWidgetCollections {
  recentlyReadBooks?: GoodreadsRecentlyReadBook[]
  updates?: GoodreadsUpdate[] | null
}

