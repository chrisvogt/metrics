import {
  hasAppliedRuntimeConfig,
  loadLocalDevelopmentEnv,
  markRuntimeConfigApplied,
} from './backend-config.js'

type RuntimeConfigWarn = (
  message: string,
  metadata: { message: string }
) => void

export interface RuntimeConfigSource<TConfig = unknown> {
  name: string
  load: () => Promise<TConfig> | TConfig
  applyToEnv: (data: TConfig) => void
}

export const bootstrapLocalRuntimeEnv = (envPath: string): void => {
  loadLocalDevelopmentEnv(envPath)
}

export const ensureRuntimeConfigApplied = async <TConfig>(
  source: RuntimeConfigSource<TConfig>,
  warn: RuntimeConfigWarn
): Promise<void> => {
  if (hasAppliedRuntimeConfig()) {
    return
  }

  try {
    const data = await source.load()
    source.applyToEnv(data)
    markRuntimeConfigApplied()
  } catch (err) {
    warn(`Could not load ${source.name} (e.g. local dev with .env)`, {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
