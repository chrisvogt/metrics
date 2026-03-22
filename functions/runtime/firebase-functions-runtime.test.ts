import { beforeEach, describe, expect, it, vi } from 'vitest'

const onRequestMock = vi.hoisted(() => vi.fn((_config, handler) => handler))
const onScheduleMock = vi.hoisted(() => vi.fn((_config, handler) => handler))
const beforeUserCreatedMock = vi.hoisted(() => vi.fn((_config, handler) => handler))

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: onRequestMock,
}))

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: onScheduleMock,
}))

vi.mock('firebase-functions/v2/identity', () => ({
  beforeUserCreated: beforeUserCreatedMock,
}))

describe('firebase-functions-runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers HTTP functions with the shared Firebase runtime config', async () => {
    const { registerFirebaseHttpFunction } = await import('./firebase-functions-runtime.js')
    const handler = vi.fn()
    const secrets = ['secret']

    const wrappedHandler = registerFirebaseHttpFunction(handler, secrets)

    expect(onRequestMock).toHaveBeenCalledWith(
      {
        region: 'us-central1',
        timeoutSeconds: 300,
        secrets,
      },
      handler
    )
    expect(wrappedHandler).toBe(handler)
  })

  it('registers scheduled functions with the shared Firebase runtime config', async () => {
    const { registerFirebaseScheduledFunction } = await import('./firebase-functions-runtime.js')
    const handler = vi.fn()
    const secrets = ['secret']

    const wrappedHandler = registerFirebaseScheduledFunction(handler, secrets)

    expect(onScheduleMock).toHaveBeenCalledWith(
      {
        schedule: 'every day 02:00',
        region: 'us-central1',
        secrets,
      },
      handler
    )
    expect(wrappedHandler).toBe(handler)
  })

  it('allows scheduled functions to override the default schedule', async () => {
    const { registerFirebaseScheduledFunction } = await import('./firebase-functions-runtime.js')
    const handler = vi.fn()
    const secrets = ['secret']

    registerFirebaseScheduledFunction(handler, secrets, {
      schedule: 'every 15 minutes',
    })

    expect(onScheduleMock).toHaveBeenCalledWith(
      {
        schedule: 'every 15 minutes',
        region: 'us-central1',
        secrets,
      },
      handler
    )
  })

  it('registers before-user-created triggers with the shared Firebase runtime config', async () => {
    const { registerFirebaseUserCreationTrigger } = await import('./firebase-functions-runtime.js')
    const handler = vi.fn()
    const secrets = ['secret']

    const wrappedHandler = registerFirebaseUserCreationTrigger(handler, secrets)

    expect(beforeUserCreatedMock).toHaveBeenCalledWith(
      {
        secrets,
      },
      handler
    )
    expect(wrappedHandler).toBe(handler)
  })
})
