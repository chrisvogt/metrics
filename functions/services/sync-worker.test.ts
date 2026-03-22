import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { configureLogger } from './logger.js'
import { processSyncJob, runNextSyncJob } from './sync-worker.js'

vi.mock('../jobs/sync-discogs-data.js', () => ({
  default: vi.fn(),
}))

vi.mock('../jobs/sync-flickr-data.js', () => ({
  default: vi.fn(),
}))

vi.mock('../jobs/sync-goodreads-data.js', () => ({
  default: vi.fn(),
}))

vi.mock('../jobs/sync-instagram-data.js', () => ({
  default: vi.fn(),
}))

vi.mock('../jobs/sync-spotify-data.js', () => ({
  default: vi.fn(),
}))

vi.mock('../jobs/sync-steam-data.js', () => ({
  default: vi.fn(),
}))

import syncDiscogsData from '../jobs/sync-discogs-data.js'
import syncFlickrData from '../jobs/sync-flickr-data.js'
import syncGoodreadsData from '../jobs/sync-goodreads-data.js'
import syncInstagramData from '../jobs/sync-instagram-data.js'
import syncSpotifyData from '../jobs/sync-spotify-data.js'
import syncSteamData from '../jobs/sync-steam-data.js'

describe('runNextSyncJob', () => {
  let documentStore: DocumentStore
  let syncJobQueue: SyncJobQueue

  beforeEach(() => {
    vi.clearAllMocks()
    configureLogger({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    })
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn(),
    }
    syncJobQueue = {
      claimJob: vi.fn(),
      claimNextJob: vi.fn(),
      completeJob: vi.fn(),
      enqueue: vi.fn(),
      failJob: vi.fn(),
      getJob: vi.fn(),
    }
  })

  it('returns NOOP when no queued job is available', async () => {
    vi.mocked(syncJobQueue.claimNextJob).mockResolvedValue(null)

    await expect(runNextSyncJob({ documentStore, syncJobQueue })).resolves.toEqual({
      result: 'NOOP',
    })
  })

  it('runs the Steam sync and completes the queue job', async () => {
    vi.mocked(syncJobQueue.claimNextJob).mockResolvedValue({
      runCount: 1,
      enqueuedAt: '2026-03-21T02:00:00.000Z',
      jobId: 'sync-chrisvogt-steam',
      mode: 'sync',
      provider: 'steam',
      status: 'processing',
      updatedAt: '2026-03-21T02:00:00.000Z',
      userId: 'chrisvogt',
    })
    vi.mocked(syncSteamData).mockResolvedValue({
      data: {
        collections: {
          ownedGames: [{ id: 1 }, { id: 2 }],
          recentlyPlayedGames: [{ id: 3 }],
        },
      },
      metrics: {
        ownedGamesCount: 2,
        recentlyPlayedGamesCount: 1,
      },
      result: 'SUCCESS',
    })

    await expect(runNextSyncJob({ documentStore, syncJobQueue })).resolves.toEqual({
      jobId: 'sync-chrisvogt-steam',
      result: 'SUCCESS',
    })
    expect(syncSteamData).toHaveBeenCalledWith(documentStore, {
      userId: 'chrisvogt',
    })
    expect(syncJobQueue.completeJob).toHaveBeenCalledWith(
      'sync-chrisvogt-steam',
      expect.objectContaining({
        metrics: {
          ownedGamesCount: 2,
          recentlyPlayedGamesCount: 1,
        },
        result: 'SUCCESS',
      })
    )
  })

  it('completes Steam jobs without queue metrics when sync omits metrics', async () => {
    vi.mocked(syncJobQueue.claimNextJob).mockResolvedValue({
      runCount: 1,
      enqueuedAt: '2026-03-21T02:00:00.000Z',
      jobId: 'sync-chrisvogt-steam',
      mode: 'sync',
      provider: 'steam',
      status: 'processing',
      updatedAt: '2026-03-21T02:00:00.000Z',
      userId: 'chrisvogt',
    })
    vi.mocked(syncSteamData).mockResolvedValue({
      result: 'SUCCESS',
    })

    await expect(runNextSyncJob({ documentStore, syncJobQueue })).resolves.toEqual({
      jobId: 'sync-chrisvogt-steam',
      result: 'SUCCESS',
    })

    expect(syncJobQueue.completeJob).toHaveBeenCalledTimes(1)
    const completedSummary = vi.mocked(syncJobQueue.completeJob).mock.calls[0][1]
    expect(completedSummary).not.toHaveProperty('metrics')
    expect(completedSummary.result).toBe('SUCCESS')
  })

  it('forwards queue metrics from the Steam sync result', async () => {
    vi.mocked(syncSteamData).mockResolvedValue({
      data: {
        collections: {
          ownedGames: [{ id: 1 }],
        },
      },
      metrics: {
        ownedGamesCount: 1,
        recentlyPlayedGamesCount: 0,
      },
      result: 'SUCCESS',
    })

    await processSyncJob({
      documentStore,
      job: {
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: 'sync-chrisvogt-steam',
        mode: 'sync',
        provider: 'steam',
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      },
      syncJobQueue,
    })

    expect(syncJobQueue.completeJob).toHaveBeenCalledWith(
      'sync-chrisvogt-steam',
      expect.objectContaining({
        metrics: {
          ownedGamesCount: 1,
          recentlyPlayedGamesCount: 0,
        },
      })
    )
  })

  it('forwards queue metrics when only recently played games are counted', async () => {
    vi.mocked(syncSteamData).mockResolvedValue({
      data: {
        collections: {
          recentlyPlayedGames: [{ id: 9 }],
        },
      },
      metrics: {
        ownedGamesCount: 0,
        recentlyPlayedGamesCount: 1,
      },
      result: 'SUCCESS',
    })

    await processSyncJob({
      documentStore,
      job: {
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: 'sync-chrisvogt-steam',
        mode: 'sync',
        provider: 'steam',
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      },
      syncJobQueue,
    })

    expect(syncJobQueue.completeJob).toHaveBeenCalledWith(
      'sync-chrisvogt-steam',
      expect.objectContaining({
        metrics: {
          ownedGamesCount: 0,
          recentlyPlayedGamesCount: 1,
        },
      })
    )
  })

  it('marks the job failed when the sync job returns FAILURE', async () => {
    vi.mocked(syncJobQueue.claimNextJob).mockResolvedValue({
      runCount: 1,
      enqueuedAt: '2026-03-21T02:00:00.000Z',
      jobId: 'sync-chrisvogt-steam',
      mode: 'sync',
      provider: 'steam',
      status: 'processing',
      updatedAt: '2026-03-21T02:00:00.000Z',
      userId: 'chrisvogt',
    })
    vi.mocked(syncSteamData).mockResolvedValue({
      error: 'Steam unavailable',
      result: 'FAILURE',
    })

    await expect(runNextSyncJob({ documentStore, syncJobQueue })).resolves.toEqual({
      jobId: 'sync-chrisvogt-steam',
      result: 'FAILURE',
    })
    expect(syncJobQueue.failJob).toHaveBeenCalledWith(
      'sync-chrisvogt-steam',
      'Steam unavailable',
      expect.objectContaining({
        result: 'FAILURE',
      })
    )
  })

  it('processes an already claimed sync job directly', async () => {
    vi.mocked(syncSteamData).mockResolvedValue({
      data: {
        collections: {
          ownedGames: [],
          recentlyPlayedGames: [],
        },
      },
      metrics: {
        ownedGamesCount: 0,
        recentlyPlayedGamesCount: 0,
      },
      result: 'SUCCESS',
    })

    await expect(processSyncJob({
      documentStore,
      job: {
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: 'sync-chrisvogt-steam',
        mode: 'sync',
        provider: 'steam',
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      },
      syncJobQueue,
    })).resolves.toEqual({
      jobId: 'sync-chrisvogt-steam',
      result: 'SUCCESS',
    })
  })

  it.each([
    ['discogs', syncDiscogsData],
    ['flickr', syncFlickrData],
    ['goodreads', syncGoodreadsData],
    ['instagram', syncInstagramData],
    ['spotify', syncSpotifyData],
  ] as const)('dispatches %s jobs through the matching sync job', async (provider, jobModule) => {
    vi.mocked(jobModule).mockResolvedValueOnce({
      result: 'SUCCESS',
    })

    await expect(processSyncJob({
      documentStore,
      job: {
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: `sync-chrisvogt-${provider}`,
        mode: 'sync',
        provider,
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      },
      syncJobQueue,
    })).resolves.toEqual({
      jobId: `sync-chrisvogt-${provider}`,
      result: 'SUCCESS',
    })
    expect(jobModule).toHaveBeenCalledWith(documentStore, {
      userId: 'chrisvogt',
    })
  })

  it('fails with a helpful error when the provider is not implemented', async () => {
    await expect(processSyncJob({
      documentStore,
      job: {
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: 'sync-chrisvogt-letterboxd',
        mode: 'sync',
        provider: 'letterboxd' as never,
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      },
      syncJobQueue,
    })).resolves.toEqual({
      jobId: 'sync-chrisvogt-letterboxd',
      result: 'FAILURE',
    })

    expect(syncJobQueue.failJob).toHaveBeenCalledWith(
      'sync-chrisvogt-letterboxd',
      'Sync is not implemented for provider: letterboxd',
      expect.objectContaining({
        result: 'FAILURE',
      })
    )
  })

  it('fails the job when the sync handler throws unexpectedly', async () => {
    vi.mocked(syncSteamData).mockRejectedValueOnce(new Error('Steam exploded'))

    await expect(processSyncJob({
      documentStore,
      job: {
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: 'sync-chrisvogt-steam',
        mode: 'sync',
        provider: 'steam',
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      },
      syncJobQueue,
    })).resolves.toEqual({
      jobId: 'sync-chrisvogt-steam',
      result: 'FAILURE',
    })

    expect(syncJobQueue.failJob).toHaveBeenCalledWith(
      'sync-chrisvogt-steam',
      expect.objectContaining({
        message: 'Steam exploded',
      }),
      expect.objectContaining({
        result: 'FAILURE',
      })
    )
  })
})
