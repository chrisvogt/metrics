export interface RuntimePlatform {
  registerHttpFunction: (
    handler: (req: unknown, res: unknown) => void | Promise<void>,
    secrets: unknown[]
  ) => unknown
  registerScheduledFunction: (
    handler: (event: unknown) => void | Promise<void>,
    secrets: unknown[]
  ) => unknown
  registerUserCreationTrigger: (
    handler: (event: unknown) => void | Promise<void>,
    secrets: unknown[]
  ) => unknown
}
