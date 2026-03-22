import { createExpressApp, getSessionAuthError } from './app/create-express-app.js'
import { createBackendBootstrap } from './bootstrap/create-backend-bootstrap.js'
import createUserJob from './jobs/create-user.js'
import type { RuntimeUserCreationData } from './ports/runtime-platform.js'
import { planSyncJobs } from './services/shadow-sync-planner.js'
import { runNextSyncJob } from './services/shadow-sync-worker.js'

const SYNC_WORKER_SCHEDULE = 'every 15 minutes'

const {
  authService,
  documentStore,
  ensureRuntimeConfigApplied,
  getClientAuthConfig,
  logger,
  resolveMediaStore,
  runtimePlatform,
  runtimeSecrets,
  syncJobQueue,
} = createBackendBootstrap()

export const expressApp = createExpressApp({
  authService,
  documentStore,
  ensureRuntimeConfigApplied,
  getClientAuthConfig,
  logger,
  resolveMediaStore,
  syncJobQueue,
})

export { getSessionAuthError }

export const runSyncPlanner = runtimePlatform.registerScheduledFunction(async () => {
  await ensureRuntimeConfigApplied()
  await planSyncJobs(syncJobQueue)
}, runtimeSecrets)

export const runSyncWorker = runtimePlatform.registerScheduledFunction(async () => {
  await ensureRuntimeConfigApplied()
  await runNextSyncJob({
    documentStore,
    syncJobQueue,
  })
}, runtimeSecrets, {
  schedule: SYNC_WORKER_SCHEDULE,
})

export const handleUserCreation = runtimePlatform.registerUserCreationTrigger(async (event) => {
  await ensureRuntimeConfigApplied()
  const rawUser: RuntimeUserCreationData | undefined = event.data
  const user = rawUser
    ? {
      ...rawUser,
      displayName: rawUser.displayName ?? undefined,
    }
    : undefined
  if (!user) {
    logger.error('handleUserCreation: event.data missing')
    return
  }
  const result = await createUserJob(user, documentStore)
  if (result.result !== 'SUCCESS') {
    logger.error('User creation trigger failed', { uid: user.uid, error: result.error })
  } else {
    logger.info('User creation trigger completed successfully', { uid: user.uid })
  }
}, runtimeSecrets)

export const app = runtimePlatform.registerHttpFunction(async (req, res) => {
  await ensureRuntimeConfigApplied()
  expressApp(req as Parameters<typeof expressApp>[0], res as Parameters<typeof expressApp>[1])
}, runtimeSecrets)
