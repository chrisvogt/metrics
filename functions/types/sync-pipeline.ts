/**
 * Shared types for the sync job pipeline, including queue descriptors, runtime
 * execution options, and job status/summary payloads.
 */
import type { SyncProviderId } from './widget-content.js'

export interface QueuedSyncJobDescriptor {
  mode: 'sync'
  provider: SyncProviderId
  userId: string
}

export interface SyncJobExecutionOptions {
  userId?: string
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
