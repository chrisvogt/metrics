import syncSteamData from '../jobs/sync-steam-data.js'
import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { getLogger } from './logger.js'
import type { QueuedSyncJob, SyncJobSummary } from '../types/sync-pipeline.js'
import type { SyncJobResult } from '../types/sync-job.js'

const toSteamSyncMetrics = (data: unknown): Record<string, number> => {
  const widgetContent = data as {
    collections?: {
      ownedGames?: unknown[]
      recentlyPlayedGames?: unknown[]
    }
  }

  return {
    ownedGamesCount: widgetContent.collections?.ownedGames?.length ?? 0,
    recentlyPlayedGamesCount: widgetContent.collections?.recentlyPlayedGames?.length ?? 0,
  }
}

const buildSummary = (
  result: SyncJobResult<unknown>,
  durationMs: number,
  metrics: Record<string, number> = {}
): SyncJobSummary => ({
  durationMs,
  metrics,
  result: result.result,
})

const runShadowSyncJob = async (
  job: QueuedSyncJob,
  documentStore: DocumentStore
): Promise<SyncJobResult<unknown>> => {
  switch (job.provider) {
  case 'steam':
    return syncSteamData(documentStore, {
      source: job.source,
      userId: job.userId,
    })
  default:
    return {
      error: `Shadow sync is not implemented for provider: ${job.provider}`,
      result: 'FAILURE',
    }
  }
}

export interface ShadowSyncWorkerResult {
  jobId?: string
  result: 'FAILURE' | 'NOOP' | 'SUCCESS'
}

export const processShadowSyncJob = async ({
  documentStore,
  job,
  syncJobQueue,
}: {
  documentStore: DocumentStore
  job: QueuedSyncJob
  syncJobQueue: SyncJobQueue
}): Promise<ShadowSyncWorkerResult> => {
  const logger = getLogger()
  const startedAt = Date.now()
  try {
    const result = await runShadowSyncJob(job, documentStore)
    const durationMs = Date.now() - startedAt
    const metrics = job.provider === 'steam' && result.result === 'SUCCESS'
      ? toSteamSyncMetrics(result.data)
      : {}
    const summary = buildSummary(result, durationMs, metrics)

    if (result.result === 'SUCCESS') {
      await syncJobQueue.completeJob(job.jobId, summary)
      logger.info('Shadow sync job completed', {
        durationMs,
        jobId: job.jobId,
        provider: job.provider,
        source: job.source,
        userId: job.userId,
      })
      return {
        jobId: job.jobId,
        result: 'SUCCESS',
      }
    }

    await syncJobQueue.failJob(job.jobId, result.error, summary)
    logger.error('Shadow sync job failed', {
      durationMs,
      error: result.error,
      jobId: job.jobId,
      provider: job.provider,
      source: job.source,
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
    logger.error('Shadow sync job threw unexpectedly', {
      durationMs,
      error,
      jobId: job.jobId,
      provider: job.provider,
      source: job.source,
      userId: job.userId,
    })
    return {
      jobId: job.jobId,
      result: 'FAILURE',
    }
  }
}

export const runNextShadowSyncJob = async ({
  documentStore,
  syncJobQueue,
}: {
  documentStore: DocumentStore
  syncJobQueue: SyncJobQueue
}): Promise<ShadowSyncWorkerResult> => {
  const job = await syncJobQueue.claimNextJob()

  if (!job) {
    return {
      result: 'NOOP',
    }
  }

  return processShadowSyncJob({
    documentStore,
    job,
    syncJobQueue,
  })
}
