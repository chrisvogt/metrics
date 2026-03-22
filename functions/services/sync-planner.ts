/**
 * Schedules provider sync work by enqueuing one sync job per supported provider
 * for the default widget user.
 */
import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { syncableWidgetIds } from '../types/widget-content.js'

export interface SyncPlannerResult {
  enqueuedJobIds: string[]
  providerCount: number
  result: 'SUCCESS'
  skippedJobIds: string[]
}

export const planSyncJobs = async (
  syncJobQueue: SyncJobQueue
): Promise<SyncPlannerResult> => {
  const userId = getDefaultWidgetUserId()
  const enqueueResults = await Promise.all(
    syncableWidgetIds.map((provider) =>
      syncJobQueue.enqueue({
        mode: 'sync',
        provider,
        userId,
      })
    )
  )

  const enqueuedJobIds = enqueueResults
    .filter((entry) => entry.status === 'enqueued')
    .map((entry) => entry.jobId)
  const skippedJobIds = enqueueResults
    .filter((entry) => entry.status === 'skipped')
    .map((entry) => entry.jobId)

  return {
    enqueuedJobIds,
    providerCount: syncableWidgetIds.length,
    result: 'SUCCESS',
    skippedJobIds,
  }
}
