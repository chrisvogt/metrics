import type { Logger } from '../ports/logger.js'

const noop = () => {}

let currentLogger: Logger = {
  error: noop,
  info: noop,
  warn: noop,
}

export const configureLogger = (logger: Logger) => {
  currentLogger = logger
}

export const getLogger = (): Logger => currentLogger
