/// <reference types="vite/client" />

declare const __GIT_SHORT_SHA__: string

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
