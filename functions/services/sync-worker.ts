/**
 * Runs queued sync jobs by dispatching to the provider-specific sync modules and
 * recording completion or failure back to the sync job queue.
 */
import syncDiscogsData from '../jobs/sync-discogs-data.js'
import syncFlickrData from '../jobs/sync-flickr-data.js'
import syncGoodreadsData from '../jobs/sync-goodreads-data.js'
import syncInstagramData from '../jobs/sync-instagram-data.js'
import syncSpotifyData from '../jobs/sync-spotify-data.js'
import syncSteamData from '../jobs/sync-steam-data.js'
import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { getLogger } from './logger.js'
import type { QueuedSyncJob, SyncJobSummary } from '../types/sync-pipeline.js'

interface SyncExecutionResult {
  data?: unknown
  error?: unknown
  metrics?: Record<string, number>
  result: 'FAILURE' | 'SUCCESS'
}

const queueMetricsFromResult = (result: SyncExecutionResult): Record<string, number> => {
  if (result.result !== 'SUCCESS' || result.metrics === undefined) {
    return {}
  }
  return result.metrics
}

const buildSummary = (result: SyncExecutionResult, durationMs: number): SyncJobSummary => {
  const metrics = queueMetricsFromResult(result)
  return {
    durationMs,
    ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
    result: result.result,
  }
}

const runSyncJob = async (
  job: QueuedSyncJob,
  documentStore: DocumentStore
): Promise<SyncExecutionResult> => {
  switch (job.provider) {
  case 'discogs':
    return syncDiscogsData(documentStore, {
      userId: job.userId,
    }) as Promise<SyncExecutionResult>
  case 'flickr':
    return syncFlickrData(documentStore, {
      userId: job.userId,
    }) as Promise<SyncExecutionResult>
  case 'goodreads':
    return syncGoodreadsData(documentStore, {
      userId: job.userId,
    }) as Promise<SyncExecutionResult>
  case 'instagram':
    return syncInstagramData(documentStore, {
      userId: job.userId,
    }) as Promise<SyncExecutionResult>
  case 'spotify':
    return syncSpotifyData(documentStore, {
      userId: job.userId,
    }) as Promise<SyncExecutionResult>
  case 'steam':
    return syncSteamData(documentStore, {
      userId: job.userId,
    }) as Promise<SyncExecutionResult>
  default:
    return {
      error: `Sync is not implemented for provider: ${job.provider}`,
      result: 'FAILURE',
    }
  }
}

export interface SyncWorkerResult {
  jobId?: string
  result: 'FAILURE' | 'NOOP' | 'SUCCESS'
}

export const processSyncJob = async ({
  documentStore,
  job,
  syncJobQueue,
}: {
  documentStore: DocumentStore
  job: QueuedSyncJob
  syncJobQueue: SyncJobQueue
}): Promise<SyncWorkerResult> => {
  const logger = getLogger()
  const startedAt = Date.now()
  try {
    const result = await runSyncJob(job, documentStore)
    const durationMs = Date.now() - startedAt
    const summary = buildSummary(result, durationMs)

    if (result.result === 'SUCCESS') {
      await syncJobQueue.completeJob(job.jobId, summary)
      logger.info('Sync job completed', {
        durationMs,
        jobId: job.jobId,
        provider: job.provider,
        userId: job.userId,
      })
      return {
        jobId: job.jobId,
        result: 'SUCCESS',
      }
    }

    await syncJobQueue.failJob(job.jobId, result.error, summary)
    logger.error('Sync job failed', {
      durationMs,
      error: result.error,
      jobId: job.jobId,
      provider: job.provider,
      userId: job.userId,
    })
    return {
      jobId: job.jobId,
      result: 'FAILURE',
    }
  } catch (error) {
    const durationMs = Date.now() - startedAt
    const summary: SyncJobSummary = {
      durationMs,
      result: 'FAILURE',
    }
    await syncJobQueue.failJob(job.jobId, error, summary)
    logger.error('Sync job threw unexpectedly', {
      durationMs,
      error,
      jobId: job.jobId,
      provider: job.provider,
      userId: job.userId,
    })
    return {
      jobId: job.jobId,
      result: 'FAILURE',
    }
  }
}

export const runNextSyncJob = async ({
  documentStore,
  syncJobQueue,
}: {
  documentStore: DocumentStore
  syncJobQueue: SyncJobQueue
}): Promise<SyncWorkerResult> => {
  const job = await syncJobQueue.claimNextJob()

  if (!job) {
    return {
      result: 'NOOP',
    }
  }

  return processSyncJob({
    documentStore,
    job,
    syncJobQueue,
  })
}
