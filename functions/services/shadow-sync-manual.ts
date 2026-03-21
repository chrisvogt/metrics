import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import type { SyncProviderId } from '../types/widget-content.js'
import { processShadowSyncJob, type ShadowSyncWorkerResult } from './shadow-sync-worker.js'

export interface ManualShadowSyncResult {
  afterJob: Awaited<ReturnType<SyncJobQueue['getJob']>>
  beforeJob: Awaited<ReturnType<SyncJobQueue['getJob']>>
  enqueue: Awaited<ReturnType<SyncJobQueue['enqueue']>>
  worker: ShadowSyncWorkerResult
}

export const runShadowSyncForProvider = async ({
  documentStore,
  provider,
  syncJobQueue,
  userId = getDefaultWidgetUserId(),
}: {
  documentStore: DocumentStore
  provider: SyncProviderId
  syncJobQueue: SyncJobQueue
  userId?: string
}): Promise<ManualShadowSyncResult> => {
  const enqueue = await syncJobQueue.enqueue({
    mode: 'shadow',
    provider,
    source: 'shadow',
    userId,
  })

  const beforeJob = await syncJobQueue.getJob(enqueue.jobId)
  const claimedJob = await syncJobQueue.claimJob(enqueue.jobId)

  const worker = claimedJob
    ? await processShadowSyncJob({
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
