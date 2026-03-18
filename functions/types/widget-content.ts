export const widgetIds = [
  'discogs',
  'github',
  'goodreads',
  'instagram',
  'spotify',
  'steam',
  'flickr',
] as const

export type WidgetId = (typeof widgetIds)[number]

export function isWidgetId(value: string): value is WidgetId {
  return (widgetIds as readonly string[]).includes(value)
}

export interface WidgetMeta<TSynced = unknown> {
  synced?: TSynced
}

export interface WidgetMetricValue {
  displayName: string
  id: string
  value: number | string
}

export interface DiscogsWidgetDocument {
  collections?: unknown
  meta?: WidgetMeta
  metrics?: Record<string, number>
  profile?: {
    profileURL?: string
  }
}

export interface DiscogsWidgetContent
  extends Omit<DiscogsWidgetDocument, 'meta'> {
  meta: WidgetMeta<Date>
}

export interface FlickrWidgetDocument {
  collections?: {
    photos?: unknown[]
  }
  meta?: WidgetMeta
  metrics?: WidgetMetricValue[]
  profile?: {
    displayName?: string
    profileURL?: string
  }
}

export type FlickrWidgetContent = FlickrWidgetDocument

export interface GitHubWidgetContent {
  [key: string]: unknown
}

export interface GoodreadsWidgetDocument {
  aiSummary?: unknown
  collections?: {
    recentlyReadBooks?: unknown[]
    updates?: unknown[] | null
  }
  meta?: WidgetMeta
  profile?: unknown
  recentBooks?: unknown[]
  summary?: string | null
}

export interface GoodreadsWidgetContent
  extends Omit<GoodreadsWidgetDocument, 'meta'> {
  meta: WidgetMeta<Date>
}

export interface InstagramWidgetDocument {
  media?: unknown[]
  meta?: WidgetMeta
  profile?: {
    biography?: string
    followersCount?: number
    mediaCount?: number
    username?: string
  }
}

export interface InstagramWidgetContent {
  collections: {
    media?: unknown[]
  }
  meta: WidgetMeta<Date>
  metrics: WidgetMetricValue[]
  profile: {
    biography: string
    displayName: string
    profileURL: string
  }
  provider: {
    displayName: 'Instagram'
    id: 'instagram'
  }
}

export interface SpotifyWidgetDocument {
  collections?: unknown
  meta?: WidgetMeta
  metrics?: WidgetMetricValue[]
  profile?: unknown
}

export interface SpotifyWidgetContent
  extends Omit<SpotifyWidgetDocument, 'meta'> {
  meta: WidgetMeta<Date>
}

export interface SteamWidgetDocument {
  aiSummary?: unknown
  collections?: unknown
  meta?: WidgetMeta
  metrics?: WidgetMetricValue[]
  profile?: unknown
}

export interface SteamWidgetContent extends Omit<SteamWidgetDocument, 'meta'> {
  meta: WidgetMeta<Date>
}

export type WidgetContentById = {
  discogs: DiscogsWidgetContent
  flickr: FlickrWidgetContent
  github: GitHubWidgetContent
  goodreads: GoodreadsWidgetContent
  instagram: InstagramWidgetContent
  spotify: SpotifyWidgetContent
  steam: SteamWidgetContent
}

export type WidgetContentUnion = WidgetContentById[WidgetId]
