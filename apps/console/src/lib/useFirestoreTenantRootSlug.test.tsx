/** @vitest-environment jsdom */

import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  readEnableFirestorePublicRoot,
  useFirestoreTenantRootSlug,
} from './useFirestoreTenantRootSlug'

describe('readEnableFirestorePublicRoot', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
    vi.unstubAllEnvs()
  })

  it('is true only when env is exactly true', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_FIRESTORE_TENANT_ROUTING', 'true')
    expect(readEnableFirestorePublicRoot()).toBe(true)
    vi.stubEnv('NEXT_PUBLIC_ENABLE_FIRESTORE_TENANT_ROUTING', 'false')
    expect(readEnableFirestorePublicRoot()).toBe(false)
  })
})

describe('useFirestoreTenantRootSlug', () => {
  const original = { ...process.env }
  const fetchMock = vi.fn()

  beforeEach(() => {
    process.env = { ...original }
    vi.stubEnv('NEXT_PUBLIC_ENABLE_FIRESTORE_TENANT_ROUTING', 'true')
    delete process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME
    delete process.env.TENANT_API_ROOT_TO_USERNAME
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    const loc = {
      ...window.location,
      hostname: 'api.dynamic.example',
      href: 'http://api.dynamic.example/',
    } as Location
    vi.stubGlobal('location', loc)
  })

  afterEach(() => {
    process.env = { ...original }
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('does not fetch when flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_FIRESTORE_TENANT_ROUTING', 'false')
    const { result } = renderHook(() => useFirestoreTenantRootSlug('/'))
    expect(result.current).toBe(null)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not fetch for non-root pathnames', async () => {
    const { result } = renderHook(() => useFirestoreTenantRootSlug('/auth'))
    await waitFor(() => expect(result.current).toBe(null))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches and sets slug when response includes username', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ username: 'zed' }),
    })

    const { result } = renderHook(() => useFirestoreTenantRootSlug('/'))

    await waitFor(() => expect(result.current).toBe('zed'))
    expect(fetchMock).toHaveBeenCalledWith('/internal/tenant-resolve?host=api.dynamic.example')
  })

  it('sets null when JSON username is empty', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ username: null }),
    })

    const { result } = renderHook(() => useFirestoreTenantRootSlug('/'))

    await waitFor(() => expect(result.current).toBe(null))
  })

  it('sets null when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network'))

    const { result } = renderHook(() => useFirestoreTenantRootSlug('/'))

    await waitFor(() => expect(result.current).toBe(null))
  })

  it('does not fetch when host is already in the env tenant map', async () => {
    process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME = 'api.dynamic.example=mapped'
    const { result } = renderHook(() => useFirestoreTenantRootSlug('/'))
    await waitFor(() => expect(result.current).toBe(null))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores response after unmount (cancelled)', async () => {
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                json: async () => ({ username: 'late' }),
              }),
            50
          )
        })
    )

    const { result, unmount } = renderHook(() => useFirestoreTenantRootSlug('/'))
    unmount()
    await new Promise((r) => setTimeout(r, 80))
    expect(result.current).toBe(null)
  })
})
