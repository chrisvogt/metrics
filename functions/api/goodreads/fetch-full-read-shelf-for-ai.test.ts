import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('xml2js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xml2js')>()
  return {
    ...actual,
    parseString: vi.fn(actual.parseString) as typeof actual.parseString,
  }
})

vi.mock('../../config/goodreads-config.js', () => ({
  GOODREADS_AI_READ_SHELF_PER_PAGE: 2,
  GOODREADS_AI_READ_SHELF_MAX_PAGES: 10,
}))

vi.mock('got', () => ({
  default: vi.fn(),
}))

vi.mock('../../config/backend-config.js', () => ({
  getGoodreadsConfig: vi.fn(() => ({
    apiKey: 'test-key',
    userId: 'user-42',
  })),
}))

import { parseString as parseStringMock } from 'xml2js'
import fetchFullReadShelfForAi from './fetch-full-read-shelf-for-ai.js'

import got from 'got'

describe('fetchFullReadShelfForAi', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('paginates until a short page and merges entries', async () => {
    const page1 = `<GoodreadsResponse><reviews start="1" end="2" total="3">
      <review>
        <read_at>2023-06-01</read_at><rating>5</rating>
        <book><title>Book One</title><isbn13>9781111111111</isbn13>
          <authors><author><name>Author A</name></author></authors>
        </book>
      </review>
      <review>
        <read_at>2023-05-01</read_at><rating>4</rating>
        <book><title>Book Two</title><isbn13>9782222222222</isbn13>
          <authors><author><name>Author B</name></author><author><name>Author C</name></author></authors>
        </book>
      </review>
    </reviews></GoodreadsResponse>`

    const page2 = `<GoodreadsResponse><reviews>
      <review>
        <read_at></read_at><date_added>2022-01-01</date_added><rating>3</rating>
        <book><title>No ISBN Book</title>
          <authors><author><name>Solo</name></author></authors>
        </book>
      </review>
    </reviews></GoodreadsResponse>`

    vi.mocked(got)
      .mockResolvedValueOnce({ body: page1 } as never)
      .mockResolvedValueOnce({ body: page2 } as never)

    const entries = await fetchFullReadShelfForAi()

    expect(got).toHaveBeenCalledTimes(2)
    expect(got.mock.calls[0][0]).toContain('user-42.xml')
    expect(got.mock.calls[0][0]).toContain('page=1')
    expect(got.mock.calls[1][0]).toContain('page=2')

    expect(entries).toEqual([
      {
        title: 'Book One',
        authors: ['Author A'],
        isbn: '9781111111111',
        rating: '5',
        finishedOrAddedDate: '2023-06-01',
      },
      {
        title: 'Book Two',
        authors: ['Author B', 'Author C'],
        isbn: '9782222222222',
        rating: '4',
        finishedOrAddedDate: '2023-05-01',
      },
      {
        title: 'No ISBN Book',
        authors: ['Solo'],
        isbn: null,
        rating: '3',
        finishedOrAddedDate: '2022-01-01',
      },
    ])
  })

  it('stops on empty page', async () => {
    vi.mocked(got).mockResolvedValueOnce({
      body: '<GoodreadsResponse><reviews></reviews></GoodreadsResponse>',
    } as never)

    const entries = await fetchFullReadShelfForAi()
    expect(entries).toEqual([])
    expect(got).toHaveBeenCalledTimes(1)
  })

  it('rejects when XML parse fails', async () => {
    vi.mocked(parseStringMock).mockImplementationOnce((body, cb) => {
      cb(new Error('invalid xml'), undefined)
    })

    vi.mocked(got).mockResolvedValueOnce({ body: '<not-valid' } as never)

    await expect(fetchFullReadShelfForAi()).rejects.toThrow('invalid xml')
  })

  it('drops reviews with no identifiable book and uses date_added when read_at is too short', async () => {
    const body = `<GoodreadsResponse><reviews>
      <review><read_at>n/a</read_at><date_added>2019-07-04</date_added><rating>5</rating>
        <book><title>Short Read Date</title><isbn13>9783333333333</isbn13></book>
      </review>
      <review><read_at>2020-01-01</read_at><rating>1</rating></review>
    </reviews></GoodreadsResponse>`

    vi.mocked(got).mockResolvedValueOnce({ body } as never)

    const entries = await fetchFullReadShelfForAi()
    expect(entries).toEqual([
      {
        authors: [],
        finishedOrAddedDate: '2019-07-04',
        isbn: '9783333333333',
        rating: '5',
        title: 'Short Read Date',
      },
    ])
  })

  it('returns no author names when the authors node has no author entries', async () => {
    const body = `<GoodreadsResponse><reviews>
      <review><read_at>2022-02-02</read_at><rating>3</rating>
        <book><title>Lonely Shelf</title><isbn13>9785555555555</isbn13><authors></authors></book>
      </review>
    </reviews></GoodreadsResponse>`

    vi.mocked(got).mockResolvedValueOnce({ body } as never)

    const entries = await fetchFullReadShelfForAi()
    expect(entries[0].authors).toEqual([])
  })

  it('skips books that have neither title nor ISBN in the XML', async () => {
    const body = `<GoodreadsResponse><reviews>
      <review><read_at>2020-01-01</read_at><rating>2</rating>
        <book><authors><author><name>Ghost</name></author></authors></book>
      </review>
    </reviews></GoodreadsResponse>`

    vi.mocked(got).mockResolvedValueOnce({ body } as never)

    const entries = await fetchFullReadShelfForAi()
    expect(entries).toEqual([])
  })

  it('includes ISBN-only rows and single-author shapes from xml2js', async () => {
    const body = `<GoodreadsResponse><reviews>
      <review><read_at>2021-01-01</read_at><rating>4</rating>
        <book><isbn13>9784444444444</isbn13>
          <authors><author><name>Only Author</name></author></authors>
        </book>
      </review>
    </reviews></GoodreadsResponse>`

    vi.mocked(got).mockResolvedValueOnce({ body } as never)

    const entries = await fetchFullReadShelfForAi()
    expect(entries).toEqual([
      {
        authors: ['Only Author'],
        finishedOrAddedDate: '2021-01-01',
        isbn: '9784444444444',
        rating: '4',
      },
    ])
  })
})
