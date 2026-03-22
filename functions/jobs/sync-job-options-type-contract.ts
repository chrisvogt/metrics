/**
 * Compile-time contract: each provider sync entrypoint must use
 * `SyncJobExecutionOptions | undefined` as its optional second parameter so the
 * shape cannot drift from `types/sync-pipeline.ts` without a build failure.
 */
import type { SyncJobExecutionOptions } from '../types/sync-pipeline.js'

import syncDiscogsData from './sync-discogs-data.js'
import syncFlickrData from './sync-flickr-data.js'
import syncGoodreadsData from './sync-goodreads-data.js'
import syncInstagramData from './sync-instagram-data.js'
import syncSpotifyData from './sync-spotify-data.js'
import syncSteamData from './sync-steam-data.js'

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false

type ExpectedSecondParameter = SyncJobExecutionOptions | undefined

type SecondParameter<F extends (...args: never) => unknown> = Parameters<F>[1]

type AllSyncJobsMatchOptions = [
  Equal<SecondParameter<typeof syncDiscogsData>, ExpectedSecondParameter>,
  Equal<SecondParameter<typeof syncFlickrData>, ExpectedSecondParameter>,
  Equal<SecondParameter<typeof syncGoodreadsData>, ExpectedSecondParameter>,
  Equal<SecondParameter<typeof syncInstagramData>, ExpectedSecondParameter>,
  Equal<SecondParameter<typeof syncSpotifyData>, ExpectedSecondParameter>,
  Equal<SecondParameter<typeof syncSteamData>, ExpectedSecondParameter>,
]

type Expect<T extends true> = T

/** Fails compilation if any default sync export diverges from SyncJobExecutionOptions. */
export type SyncJobOptionsSecondParameterContract = Expect<
  AllSyncJobsMatchOptions extends [true, true, true, true, true, true] ? true : false
>
