export interface RuntimeUserCreationData {
  uid: string
  email?: string
  displayName?: string | null
}

export interface RuntimeUserCreationEvent {
  data?: RuntimeUserCreationData
}

export interface RuntimePlatform {
  registerHttpFunction: (
    handler: (req: unknown, res: unknown) => void | Promise<void>,
    secrets: readonly unknown[]
  ) => unknown
  registerScheduledFunction: (
    handler: (event: unknown) => void | Promise<void>,
    secrets: readonly unknown[]
  ) => unknown
  registerUserCreationTrigger: (
    handler: (event: RuntimeUserCreationEvent) => void | Promise<void>,
    secrets: readonly unknown[]
  ) => unknown
}
