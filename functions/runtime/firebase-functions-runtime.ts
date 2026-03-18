import {
  beforeUserCreated,
  type AuthBlockingEvent,
} from 'firebase-functions/v2/identity'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule, type ScheduledEvent } from 'firebase-functions/v2/scheduler'

export const FIREBASE_FUNCTIONS_REGION = 'us-central1'
export const FIREBASE_SCHEDULE = 'every day 02:00'

type FirebaseHttpHandler = Parameters<typeof onRequest>[0]

export const registerFirebaseHttpFunction = (
  handler: (req: unknown, res: unknown) => void | Promise<void>,
  secrets: readonly unknown[]
) =>
  onRequest(
    {
      region: FIREBASE_FUNCTIONS_REGION,
      timeoutSeconds: 300,
      secrets: secrets as never,
    },
    handler as unknown as FirebaseHttpHandler
  )

export const registerFirebaseScheduledFunction = (
  handler: (event: ScheduledEvent) => void | Promise<void>,
  secrets: readonly unknown[]
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
  secrets: readonly unknown[]
) =>
  beforeUserCreated(
    {
      secrets: secrets as never,
    },
    handler
  )
