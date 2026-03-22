/**
 * Provides the manual "sync this provider now" flow used by the HTTP endpoint.
 * It enqueues a job, claims it immediately, runs it inline, and returns queue
 * state before and after execution for debugging and UI feedback.
 */
import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import type { SyncProviderId } from '../types/widget-content.js'
import { processSyncJob, type SyncWorkerResult } from './sync-worker.js'

export interface ManualSyncResult {
  afterJob: Awaited<ReturnType<SyncJobQueue['getJob']>>
  beforeJob: Awaited<ReturnType<SyncJobQueue['getJob']>>
  enqueue: Awaited<ReturnType<SyncJobQueue['enqueue']>>
  worker: SyncWorkerResult
}

export const runSyncForProvider = async ({
  documentStore,
  provider,
  syncJobQueue,
  userId = getDefaultWidgetUserId(),
}: {
  documentStore: DocumentStore
  provider: SyncProviderId
  syncJobQueue: SyncJobQueue
  userId?: string
}): Promise<ManualSyncResult> => {
  const enqueue = await syncJobQueue.enqueue({
    mode: 'sync',
    provider,
    userId,
  })

  const beforeJob = await syncJobQueue.getJob(enqueue.jobId)
  const claimedJob = await syncJobQueue.claimJob(enqueue.jobId)

  const worker = claimedJob
    ? await processSyncJob({
      documentStore,
      job: claimedJob,
      syncJobQueue,
    })
    : { jobId: enqueue.jobId, result: 'NOOP' as const }

  const afterJob = await syncJobQueue.getJob(enqueue.jobId)

  return {
    afterJob,
    beforeJob,
    enqueue,
    worker,
  }
}
