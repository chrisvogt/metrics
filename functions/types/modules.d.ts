declare module 'compression' {
  import type { RequestHandler } from 'express'

  export default function compression(): RequestHandler
}

declare module 'cookie-parser' {
  import type { RequestHandler } from 'express'

  export default function cookieParser(secret?: string | string[], options?: unknown): RequestHandler
}

declare module 'graphql-got' {
  interface GraphqlGotOptions {
    query: string
    headers?: Record<string, string>
    variables?: Record<string, string>
  }

  interface GraphqlGotResponse<TBody = unknown> {
    body: TBody
  }

  export default function graphqlGot<TBody = unknown>(
    url: string,
    options: GraphqlGotOptions
  ): Promise<GraphqlGotResponse<TBody>>
}

declare module 'xml2js'
declare module 'to-https'
declare module 'requestretry'
