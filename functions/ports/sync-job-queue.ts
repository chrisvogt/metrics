import type {
  EnqueueSyncJobResult,
  QueuedSyncJob,
  QueuedSyncJobDescriptor,
  SyncJobSummary,
} from '../types/sync-pipeline.js'

export interface SyncJobQueue {
  claimJob(jobId: string): Promise<QueuedSyncJob | null>
  claimNextJob(): Promise<QueuedSyncJob | null>
  completeJob(jobId: string, summary: SyncJobSummary): Promise<void>
  enqueue(job: QueuedSyncJobDescriptor): Promise<EnqueueSyncJobResult>
  failJob(jobId: string, error: unknown, summary: SyncJobSummary): Promise<void>
  getJob(jobId: string): Promise<QueuedSyncJob | null>
  listRecentJobs(limit?: number): Promise<QueuedSyncJob[]>
}
