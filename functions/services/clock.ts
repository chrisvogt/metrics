import type { Clock } from '../ports/clock.js'

const systemClock: Clock = {
  now: () => new Date(),
}

let currentClock: Clock = systemClock

export const configureClock = (clock: Clock) => {
  currentClock = clock
}

export const getClock = (): Clock => currentClock
