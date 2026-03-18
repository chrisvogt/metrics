import type { DocumentStore } from '../ports/document-store.js'
import type {
  WidgetContentById,
  WidgetContentUnion,
  WidgetId,
} from '../types/widget-content.js'
import { isWidgetId, widgetIds } from '../types/widget-content.js'
import getDiscogsWidgetContent from './get-discogs-widget-content.js'
import getFlickrWidgetContent from './get-flickr-widget-content.js'
import getGitHubWidgetContent from './get-github-widget-content.js'
import getGoodreadsWidgetContent from './get-goodreads-widget-content.js'
import getInstagramWidgetContent from './get-instagram-widget-content.js'
import getSpotifyWidgetContent from './get-spotify-widget-content.js'
import getSteamWidgetContent from './get-steam-widget-content.js'

type InjectedWidgetHandler<TWidgetId extends WidgetId> = (
  userId: string,
  documentStore: DocumentStore
) => Promise<WidgetContentById[TWidgetId]>

const widgetHandlerRegistry: {
  [TWidgetId in WidgetId]: InjectedWidgetHandler<TWidgetId>
} = {
  discogs: getDiscogsWidgetContent,
  flickr: getFlickrWidgetContent,
  github: getGitHubWidgetContent,
  goodreads: getGoodreadsWidgetContent,
  instagram: getInstagramWidgetContent,
  spotify: getSpotifyWidgetContent,
  steam: getSteamWidgetContent,
}

export const validWidgetIds = widgetIds

export const getWidgetContent = async (
  widgetId: WidgetId,
  userId: string,
  documentStore: DocumentStore
): Promise<WidgetContentUnion> => {
  if (!isWidgetId(widgetId)) {
    throw new Error(`Unrecognized widget type: ${widgetId}`)
  }

  const getContent = widgetHandlerRegistry[widgetId]!
  return getContent(userId, documentStore)
}
