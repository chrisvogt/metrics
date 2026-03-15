import {
  beforeUserCreated,
  type AuthBlockingEvent,
} from 'firebase-functions/v2/identity'
import { onRequest, type Request } from 'firebase-functions/v2/https'
import { onSchedule, type ScheduledEvent } from 'firebase-functions/v2/scheduler'

export const FIREBASE_FUNCTIONS_REGION = 'us-central1'
export const FIREBASE_SCHEDULE = 'every day 02:00'

export const registerFirebaseHttpFunction = (
  handler: (req: Request, res: any) => void | Promise<void>,
  secrets: unknown[]
) =>
  onRequest(
    {
      region: FIREBASE_FUNCTIONS_REGION,
      timeoutSeconds: 300,
      secrets: secrets as never,
    },
    handler as never
  )

export const registerFirebaseScheduledFunction = (
  handler: (event: ScheduledEvent) => void | Promise<void>,
  secrets: unknown[]
) =>
  onSchedule(
    {
      schedule: FIREBASE_SCHEDULE,
      region: FIREBASE_FUNCTIONS_REGION,
      secrets: secrets as never,
    },
    handler
  )

export const registerFirebaseUserCreationTrigger = (
  handler: (event: AuthBlockingEvent) => void | Promise<void>,
  secrets: unknown[]
) =>
  beforeUserCreated(
    {
      secrets: secrets as never,
    },
    handler
  )
