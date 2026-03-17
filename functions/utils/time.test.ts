import { beforeEach, describe, expect, it, vi } from 'vitest'

const getClockMock = vi.hoisted(() =>
  vi.fn(() => ({
    now: () => new Date('2026-03-16T08:30:00.000Z'),
  }))
)

vi.mock('../services/clock.js', () => ({
  getClock: getClockMock,
}))

describe('time helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('serializes the current clock time when no value is provided', async () => {
    const { toStoredDateTime } = await import('./time.js')

    expect(toStoredDateTime()).toBe('2026-03-16T08:30:00.000Z')
    expect(getClockMock).toHaveBeenCalledTimes(1)
  })

  it('serializes explicit dates as ISO strings', async () => {
    const { toStoredDateTime } = await import('./time.js')

    expect(toStoredDateTime(new Date('2026-03-16T09:45:00.000Z'))).toBe(
      '2026-03-16T09:45:00.000Z'
    )
  })

  it('parses ISO strings and falls back for invalid strings', async () => {
    const { toDateOrDefault } = await import('./time.js')
    const fallback = new Date('2026-03-16T10:00:00.000Z')

    expect(toDateOrDefault('2026-03-16T09:45:00.000Z')).toEqual(
      new Date('2026-03-16T09:45:00.000Z')
    )
    expect(toDateOrDefault('not-a-date', fallback)).toEqual(fallback)
  })

  it('supports Date, toDate, and firestore timestamp-like values', async () => {
    const { toDateOrDefault } = await import('./time.js')
    const date = new Date('2026-03-16T11:00:00.000Z')

    expect(toDateOrDefault(date)).toBe(date)
    expect(
      toDateOrDefault({
        toDate: () => date,
      })
    ).toEqual(date)
    expect(
      toDateOrDefault({
        _seconds: 1710374400,
        _nanoseconds: 125000000,
      })
    ).toEqual(new Date('2024-03-14T00:00:00.125Z'))
  })

  it('uses the provided fallback when the value cannot be normalized', async () => {
    const { toDateOrDefault } = await import('./time.js')
    const fallback = new Date('2026-03-16T12:00:00.000Z')

    expect(toDateOrDefault(undefined, fallback)).toEqual(fallback)
    expect(toDateOrDefault({ _seconds: 'bad' }, fallback)).toEqual(fallback)
  })
})
