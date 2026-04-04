declare module 'compression' {
  import type { RequestHandler } from 'express'

  export default function compression(): RequestHandler
}

declare module 'cookie-parser' {
  import type { RequestHandler } from 'express'

  export default function cookieParser(secret?: string | string[], options?: unknown): RequestHandler
}

declare module 'xml2js'
declare module 'to-https'
