import { describe, it, expect } from 'vitest'
import getUserStatus from './get-user-status.js'

describe('getUserStatus', () => {
  it('should parse a user status update object correctly', () => {
    const input = {
      action_text: 'is reading',
      image_url: 'https://example.com/image.jpg',
      link: 'https://goodreads.com/user_status/show/123',
      object: {
        user_status: {
          book: {
            author: {
              about: 'About the author',
              name: 'Author Name',
              sort_by_name: 'Name, Author',
              shelf_display_name: 'Author Name'
            },
            format: 'Hardcover',
            id: { _: '987654' },
            isbn: '1234567890',
            isbn13: '1234567890123',
            num_pages: { _: '350' },
            publication_year: { _: '2020' },
            publisher: 'Publisher Name',
            sort_by_title: 'Book Title',
            title: 'Book Title'
          },
          created_at: { _: '2023-01-01T00:00:00Z' },
          page: { _: '100' },
          percent: { _: '28' },
          updated_at: { _: '2023-01-02T00:00:00Z' },
          user_id: { _: 'user123' }
        }
      },
      type: 'user_status'
    }

    const result = getUserStatus(input)
    expect(result).toEqual({
      actionText: 'is reading',
      book: {
        author: {
          about: 'About the author',
          displayName: 'Author Name',
          name: 'Author Name',
          sortName: 'Name, Author'
        },
        format: 'Hardcover',
        goodreadsID: '987654',
        isbn: '1234567890',
        isbn13: '1234567890123',
        pageCount: 350,
        publicationYear: 2020,
        publisher: 'Publisher Name',
        sortTitle: 'Book Title',
        title: 'Book Title'
      },
      created: '2023-01-01T00:00:00Z',
      imageURL: 'https://example.com/image.jpg',
      link: 'https://goodreads.com/user_status/show/123',
      page: 100,
      percent: 28,
      type: 'user_status',
      updated: '2023-01-02T00:00:00Z',
      userID: 'user123'
    })
  })

  it('should handle missing optional fields gracefully', () => {
    const input = {
      action_text: 'is reading',
      image_url: undefined,
      link: undefined,
      object: {
        user_status: {
          book: {
            author: {
              about: undefined,
              name: undefined,
              sort_by_name: undefined,
              shelf_display_name: undefined
            },
            format: undefined,
            id: { _: undefined },
            isbn: undefined,
            isbn13: undefined,
            num_pages: { _: undefined },
            publication_year: { _: undefined },
            publisher: undefined,
            sort_by_title: undefined,
            title: undefined
          },
          created_at: { _: undefined },
          page: { _: undefined },
          percent: { _: undefined },
          updated_at: { _: undefined },
          user_id: { _: undefined }
        }
      },
      type: undefined
    }

    const result = getUserStatus(input)
    expect(result).toEqual({
      actionText: 'is reading',
      book: {
        author: {
          about: undefined,
          displayName: undefined,
          name: undefined,
          sortName: undefined
        },
        format: undefined,
        goodreadsID: undefined,
        isbn: undefined,
        isbn13: undefined,
        pageCount: NaN,
        publicationYear: NaN,
        publisher: undefined,
        sortTitle: undefined,
        title: undefined
      },
      created: undefined,
      imageURL: undefined,
      link: undefined,
      page: NaN,
      percent: NaN,
      type: undefined,
      updated: undefined,
      userID: undefined
    })
  })
}) 