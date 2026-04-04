import { describe, expect, it, vi } from 'vitest'

import { buildWidgetFetchHeaders } from './buildWidgetFetchHeaders'

describe('buildWidgetFetchHeaders', () => {
  it('returns no Authorization when user is null or undefined', async () => {
    await expect(buildWidgetFetchHeaders(null)).resolves.toEqual({})
    await expect(buildWidgetFetchHeaders(undefined)).resolves.toEqual({})
  })

  it('returns Bearer header from getIdToken when user is present', async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue('id-token-xyz'),
    } as unknown as import('firebase/auth').User

    await expect(buildWidgetFetchHeaders(user)).resolves.toEqual({
      Authorization: 'Bearer id-token-xyz',
    })
    expect(user.getIdToken).toHaveBeenCalledTimes(1)
  })
})
