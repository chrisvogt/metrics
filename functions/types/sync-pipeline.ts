import type { SyncProviderId, WidgetDataSource } from './widget-content.js'

export interface QueuedSyncJobDescriptor {
  mode: 'shadow'
  provider: SyncProviderId
  source: WidgetDataSource
  userId: string
}

export type QueuedSyncJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface SyncJobSummary {
  durationMs: number
  metrics?: Record<string, number>
  result: 'SUCCESS' | 'FAILURE'
}

export interface QueuedSyncJob extends QueuedSyncJobDescriptor {
  runCount: number
  completedAt?: string
  enqueuedAt: string
  error?: string
  jobId: string
  lastStartedAt?: string
  status: QueuedSyncJobStatus
  summary?: SyncJobSummary
  updatedAt: string
}

export interface EnqueueSyncJobResult {
  jobId: string
  status: 'enqueued' | 'skipped'
}
