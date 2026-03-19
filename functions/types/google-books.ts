export interface GoogleBooksIndustryIdentifier {
  type: string
  identifier: string
}

export interface GoogleBooksImageLinks {
  smallThumbnail?: string
  thumbnail?: string
  // Other sizes exist, but we only use these in the sync pipeline.
}

export interface GoogleBooksVolumeInfoSubset {
  authors?: string[]
  categories?: string[]
  description?: string
  imageLinks?: GoogleBooksImageLinks
  infoLink?: string
  pageCount?: number
  previewLink?: string
  subtitle?: string
  title?: string
  industryIdentifiers?: GoogleBooksIndustryIdentifier[]
}

export interface GoogleBooksVolumeSubset {
  id: string
  volumeInfo?: GoogleBooksVolumeInfoSubset
}

export interface GoogleBooksVolumesResponseSubset {
  items?: GoogleBooksVolumeSubset[]
}

export interface GoogleBooksFetchByIsbnInput {
  isbn: string
  rating?: string | null
}

export interface GoogleBooksFetchByIsbnResult {
  book?: GoogleBooksVolumeSubset
  rating?: string | null
}

export const isGoogleBooksVolumesResponseSubset = (
  value: unknown,
): value is GoogleBooksVolumesResponseSubset => {
  if (!value || typeof value !== 'object') return false
  const maybeItems = (value as { items?: unknown }).items
  return Array.isArray(maybeItems)
}

