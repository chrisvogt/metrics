declare module 'lusca' {
  /** Path rule for lusca’s `blocklist` option (third-party name). */
  type CsrfPathExclusionRule = { path: string; type: 'startsWith' | 'exact' }

  interface CsrfOptions {
    angular?: boolean
    secret?: string
    impl?: unknown
    /** Request paths that skip CSRF (no token cookies). Option name is defined by lusca. */
    blocklist?: string | Array<string | CsrfPathExclusionRule>
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
