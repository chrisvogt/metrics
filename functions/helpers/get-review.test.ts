import { describe, expect, it } from 'vitest'

import getReview from './get-review.js'

describe('getReview', () => {
  it('maps a Goodreads Friends update payload into a review shape', () => {
    const update = {
      type: 'rating',
      updated_at: '2024-01-01',
      link: 'https://goodreads.com/review/1',
      actionText: 'Rated',
      action: { rating: '5' },
      actor: { name: 'Reader', link: 'https://goodreads.com/user/1', imageURL: 'https://img/a.jpg' },
      object: {
        book: {
          id: '123',
          title: 'Example',
          link: 'https://goodreads.com/book/123',
          authors: {
            author: {
              id: '9',
              average_rating: '4.2',
              ratingsCount: 10,
              text_reviews_count: 3,
              image_url: { _: 'https://author.jpg', nophoto: false },
              small_image_url: { _: 'https://author-sm.jpg', nophoto: false },
            },
          },
        },
      },
    }

    const r = getReview(update)

    expect(r).toMatchObject({
      type: 'rating',
      rating: 5,
      actionText: 'Rated',
      link: update.link,
      actor: { name: 'Reader', link: update.actor.link, imageURL: 'https://img/a.jpg' },
      book: {
        goodreadsID: '123',
        title: 'Example',
        author: expect.objectContaining({
          goodreadsID: '9',
          averageRating: '4.2',
          imageURL: 'https://author.jpg',
          hasImageURL: false,
          smallImageURL: 'https://author-sm.jpg',
          hasSmallImageURL: false,
        }),
      },
    })
  })

  it('handles missing optional author and image defaults', () => {
    const update = {
      type: 'review',
      updated_at: '2024-02-02',
      link: 'https://goodreads.com/review/2',
      actionText: 'Reviewed',
      action: { rating: '0' },
      actor: { name: 'A', link: 'l', imageURL: 'i' },
      object: {
        book: {
          id: '55',
          title: 'Solo',
          link: 'b',
          authors: undefined,
        },
      },
    }

    const r = getReview(update)

    expect(r.book.author).toBeUndefined()
    expect(r.book.title).toBe('Solo')
    expect(r.rating).toBe(0)
  })

  it('uses nophoto-only author image shapes', () => {
    const update = {
      type: 'rating',
      updated_at: 'x',
      link: 'l',
      actionText: 't',
      action: { rating: '3' },
      actor: { name: 'n', link: 'l', imageURL: 'i' },
      object: {
        book: {
          id: '1',
          title: 'T',
          link: 'b',
          authors: {
            author: {
              id: '2',
              image_url: { nophoto: true },
              small_image_url: { nophoto: true },
            },
          },
        },
      },
    }

    const r = getReview(update)

    expect(r.book.author).toMatchObject({
      imageURL: '',
      hasImageURL: true,
      smallImageURL: '',
      hasSmallImageURL: true,
    })
  })
})
