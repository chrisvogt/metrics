declare module 'lusca' {
  type CsrfPathBlockRule = { path: string; type: 'startsWith' | 'exact' }

  interface CsrfOptions {
    angular?: boolean
    secret?: string
    impl?: unknown
    /** Paths that skip CSRF entirely (no token cookie). Alias: `blacklist`. */
    blocklist?: string | Array<string | CsrfPathBlockRule>
    /** @deprecated Use `blocklist` */
    blacklist?: string | Array<string | CsrfPathBlockRule>
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
