declare module 'lusca' {
  interface CsrfOptions {
    angular?: boolean
    secret?: string
    impl?: unknown
    cookie?: {
      name?: string
      options?: {
        httpOnly?: boolean
        sameSite?: 'lax' | 'strict'
        secure?: boolean
      }
    }
  }

  interface LuscaModule {
    csrf: (options?: CsrfOptions) => (req: unknown, res: unknown, next: (error?: unknown) => void) => void
  }

  const lusca: LuscaModule

  export default lusca
}
