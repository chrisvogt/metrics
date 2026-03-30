/**
 * Flickr `flickr.people.getPhotos` normalized response used by sync + widget.
 */

export interface FlickrPhoto {
  id?: string
  title?: string
  description: string
  dateTaken?: string
  ownerName?: string
  thumbnailUrl?: string
  mediumUrl?: string
  largeUrl?: string
  link: string
}

export interface FlickrPhotosResponse {
  photos: FlickrPhoto[]
  total?: number
  page?: number
  pages?: number
}
