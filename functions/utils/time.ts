import { getClock } from '../services/clock.js'

export const toStoredDateTime = (value: Date = getClock().now()): string => value.toISOString()

export const toDateOrDefault = (value: unknown, fallback: Date = new Date(0)) => {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? fallback : parsed
  }

  if (typeof (value as { toDate?: unknown })?.toDate === 'function') {
    return ((value as { toDate: () => Date }).toDate())
  }

  const seconds = (value as { _seconds?: unknown })?._seconds
  if (typeof seconds === 'number') {
    const nanoseconds = (value as { _nanoseconds?: unknown })?._nanoseconds
    return new Date(
      seconds * 1000 + Math.floor((typeof nanoseconds === 'number' ? nanoseconds : 0) / 1000000)
    )
  }

  return fallback
}
