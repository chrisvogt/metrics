import { describe, expect, it } from 'vitest'

import { toDateOrDefault, toUserWidgetContentPath, toWidgetContentPath } from './widget-document-store.js'

describe('widget-document-store helpers', () => {
  it('builds widget-content document paths', () => {
    expect(toWidgetContentPath('users/chrisvogt/flickr')).toBe(
      'users/chrisvogt/flickr/widget-content'
    )
  })

  it('builds widget-content paths from user and provider', () => {
    expect(toUserWidgetContentPath('chronogrove', 'instagram')).toBe(
      'users/chronogrove/instagram/widget-content'
    )
  })

  it('returns date values as-is', () => {
    const value = new Date('2026-03-14T00:00:00.000Z')

    expect(toDateOrDefault(value)).toBe(value)
  })

  it('converts values with toDate methods', () => {
    const date = new Date('2026-03-14T01:00:00.000Z')

    expect(
      toDateOrDefault({
        toDate: () => date,
      })
    ).toEqual(date)
  })

  it('converts firestore timestamp-like objects', () => {
    expect(
      toDateOrDefault({
        _seconds: 1710374400,
        _nanoseconds: 500000000,
      })
    ).toEqual(new Date('2024-03-14T00:00:00.500Z'))
  })

  it('defaults missing nanoseconds to zero for timestamp-like objects', () => {
    expect(
      toDateOrDefault({
        _seconds: 1710374400,
      })
    ).toEqual(new Date('2024-03-14T00:00:00.000Z'))
  })

  it('uses zero date fallback when no timestamp is present', () => {
    expect(toDateOrDefault(undefined)).toEqual(new Date(0))
  })

  it('uses custom fallback when provided', () => {
    const fallback = new Date('2026-03-14T02:00:00.000Z')

    expect(toDateOrDefault({ _seconds: 'bad' }, fallback)).toEqual(fallback)
  })
})
