import getGitHubWidgetContent from './get-github-widget-content.js'
import getGoodreadsWidgetContent from './get-goodreads-widget-content.js'
import getInstagramWidgetContent from './get-instagram-widget-content.js'
import getSpotifyWidgetContent from './get-spotify-widget-content.js'
import getSteamWidgetContent from './get-steam-widget-content.js'
import getFlickrWidgetContent from './get-flickr-widget-content.js'

const widgetHandlerRegistry = {
  github: getGitHubWidgetContent,
  goodreads: getGoodreadsWidgetContent,
  instagram: getInstagramWidgetContent,
  spotify: getSpotifyWidgetContent,
  steam: getSteamWidgetContent,
  flickr: getFlickrWidgetContent
}

const validWidgetIds = Object.keys(widgetHandlerRegistry)

const getWidgetContent = async widgetId => {
  if (!validWidgetIds.includes(widgetId)) {
    throw new Error(`Unrecognized widget type: ${widgetId}`)
  }

  const getContent = widgetHandlerRegistry[widgetId]
  const widgetContent = await getContent()

  return widgetContent
}

export {
  getWidgetContent,
  validWidgetIds
}
