const getGitHubWidgetContent = require('./get-github-widget-content')
// const getGoodreadsWidgetContent = require('./get-goodreads-widget-content')
const getInstagramWidgetContent = require('./get-instagram-widget-content')
const getSpotifyWidgetContent = require('./get-spotify-widget-content')

const widgetHandlerRegistry = {
  github: getGitHubWidgetContent,
  // goodreads: getGoodreadsWidgetContent,
  instagram: getInstagramWidgetContent,
  spotify: getSpotifyWidgetContent
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

module.exports = {
  getWidgetContent,
  validWidgetIds
}
