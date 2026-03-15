import { Timestamp } from 'firebase/firestore'

export const toWidgetContentPath = (collectionPath: string) => `${collectionPath}/widget-content`

export const toDateOrDefault = (value: unknown, fallback: Date = new Date(0)) => {
  if (value instanceof Date) {
    return value
  }

  if (typeof (value as { toDate?: unknown })?.toDate === 'function') {
    return ((value as { toDate: () => Date }).toDate())
  }

  const seconds = (value as { _seconds?: unknown })?._seconds
  if (typeof seconds === 'number') {
    const nanoseconds = (value as { _nanoseconds?: unknown })?._nanoseconds
    return new Timestamp(seconds, typeof nanoseconds === 'number' ? nanoseconds : 0).toDate()
  }

  return fallback
}
