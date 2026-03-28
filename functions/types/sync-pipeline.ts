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

/** Streamed to the browser during manual sync (SSE); ignored by scheduled worker. */
export interface SyncProgressEvent {
  /** Stable id for theming or i18n (e.g. goodreads.google_books). */
  phase: string
  message: string
}

export type SyncProgressReporter = (event: SyncProgressEvent) => void

export interface SyncJobExecutionOptions {
  userId?: string
  onProgress?: SyncProgressReporter
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
