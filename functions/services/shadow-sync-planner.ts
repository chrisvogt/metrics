import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { syncableWidgetIds } from '../types/widget-content.js'

export interface SyncPlannerResult {
  enqueuedJobIds: string[]
  providerCount: number
  result: 'SUCCESS'
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

  return {
    enqueuedJobIds: enqueueResults
      .filter((entry) => entry.status === 'enqueued')
      .map((entry) => entry.jobId),
    providerCount: syncableWidgetIds.length,
    result: 'SUCCESS',
  }
}
