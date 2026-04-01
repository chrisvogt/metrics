import pkg from '../package.json' with { type: 'json' }

/** Outbound User-Agent for third-party HTTP APIs (e.g. Discogs). */
export const chronogroveHttpUserAgent = `chronogrove/${pkg.version}`
