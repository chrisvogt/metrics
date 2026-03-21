import { getShadowSyncConfig } from '../config/backend-config.js'
import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'

export interface ShadowSyncPlannerResult {
  enqueuedJobIds: string[]
  providerCount: number
  result: 'NOOP' | 'SUCCESS'
}

export const planShadowSyncJobs = async (
  syncJobQueue: SyncJobQueue
): Promise<ShadowSyncPlannerResult> => {
  const { enabled, providers } = getShadowSyncConfig()

  if (!enabled || providers.length === 0) {
    return {
      enqueuedJobIds: [],
      providerCount: 0,
      result: 'NOOP',
    }
  }

  const userId = getDefaultWidgetUserId()
  const enqueueResults = await Promise.all(
    providers.map((provider) =>
      syncJobQueue.enqueue({
        mode: 'shadow',
        provider,
        source: 'shadow',
        userId,
      })
    )
  )

  return {
    enqueuedJobIds: enqueueResults
      .filter((entry) => entry.status === 'enqueued')
      .map((entry) => entry.jobId),
    providerCount: providers.length,
    result: 'SUCCESS',
  }
}
