import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { configureLogger } from './logger.js'
import { processShadowSyncJob, runNextShadowSyncJob } from './shadow-sync-worker.js'

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

describe('runNextShadowSyncJob', () => {
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
      listRecentJobs: vi.fn(),
    }
  })

  it('returns NOOP when no queued job is available', async () => {
    vi.mocked(syncJobQueue.claimNextJob).mockResolvedValue(null)

    await expect(runNextShadowSyncJob({ documentStore, syncJobQueue })).resolves.toEqual({
      result: 'NOOP',
    })
  })

  it('runs the Steam shadow sync and completes the queue job', async () => {
    vi.mocked(syncJobQueue.claimNextJob).mockResolvedValue({
      runCount: 1,
      enqueuedAt: '2026-03-21T02:00:00.000Z',
      jobId: 'shadow-chrisvogt-steam-shadow',
      mode: 'shadow',
      provider: 'steam',
      source: 'shadow',
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
      result: 'SUCCESS',
    })

    await expect(runNextShadowSyncJob({ documentStore, syncJobQueue })).resolves.toEqual({
      jobId: 'shadow-chrisvogt-steam-shadow',
      result: 'SUCCESS',
    })
    expect(syncSteamData).toHaveBeenCalledWith(documentStore, {
      source: 'shadow',
      userId: 'chrisvogt',
    })
    expect(syncJobQueue.completeJob).toHaveBeenCalledWith(
      'shadow-chrisvogt-steam-shadow',
      expect.objectContaining({
        metrics: {
          ownedGamesCount: 2,
          recentlyPlayedGamesCount: 1,
        },
        result: 'SUCCESS',
      })
    )
  })

  it('marks the job failed when the sync job returns FAILURE', async () => {
    vi.mocked(syncJobQueue.claimNextJob).mockResolvedValue({
      runCount: 1,
      enqueuedAt: '2026-03-21T02:00:00.000Z',
      jobId: 'shadow-chrisvogt-steam-shadow',
      mode: 'shadow',
      provider: 'steam',
      source: 'shadow',
      status: 'processing',
      updatedAt: '2026-03-21T02:00:00.000Z',
      userId: 'chrisvogt',
    })
    vi.mocked(syncSteamData).mockResolvedValue({
      error: 'Steam unavailable',
      result: 'FAILURE',
    })

    await expect(runNextShadowSyncJob({ documentStore, syncJobQueue })).resolves.toEqual({
      jobId: 'shadow-chrisvogt-steam-shadow',
      result: 'FAILURE',
    })
    expect(syncJobQueue.failJob).toHaveBeenCalledWith(
      'shadow-chrisvogt-steam-shadow',
      'Steam unavailable',
      expect.objectContaining({
        result: 'FAILURE',
      })
    )
  })

  it('processes an already claimed shadow sync job directly', async () => {
    vi.mocked(syncSteamData).mockResolvedValue({
      data: {
        collections: {
          ownedGames: [],
          recentlyPlayedGames: [],
        },
      },
      result: 'SUCCESS',
    })

    await expect(processShadowSyncJob({
      documentStore,
      job: {
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: 'shadow-chrisvogt-steam-shadow',
        mode: 'shadow',
        provider: 'steam',
        source: 'shadow',
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      },
      syncJobQueue,
    })).resolves.toEqual({
      jobId: 'shadow-chrisvogt-steam-shadow',
      result: 'SUCCESS',
    })
  })

  it.each([
    ['discogs', syncDiscogsData],
    ['flickr', syncFlickrData],
    ['goodreads', syncGoodreadsData],
    ['instagram', syncInstagramData],
    ['spotify', syncSpotifyData],
  ] as const)('dispatches %s shadow jobs through the matching sync job', async (provider, jobModule) => {
    vi.mocked(jobModule).mockResolvedValueOnce({
      result: 'SUCCESS',
    })

    await expect(processShadowSyncJob({
      documentStore,
      job: {
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: `shadow-chrisvogt-${provider}-shadow`,
        mode: 'shadow',
        provider,
        source: 'shadow',
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      },
      syncJobQueue,
    })).resolves.toEqual({
      jobId: `shadow-chrisvogt-${provider}-shadow`,
      result: 'SUCCESS',
    })
    expect(jobModule).toHaveBeenCalledWith(documentStore, {
      source: 'shadow',
      userId: 'chrisvogt',
    })
  })
})
