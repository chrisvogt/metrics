const getGitHubWidgetContent = require('./lib/get-github-widget-content')
const getGoodreadsWidgetContent = require('./lib/get-goodreads-widget-content')
const fetchRecentInstagramMedia = require('./lib/fetch-recent-instagram-media')
const getSpotifyWidgetContent = require('./lib/get-spotify-widget-content')

const widgetHandlerRegistry = {
  github: getGitHubWidgetContent,
  goodreads: getGoodreadsWidgetContent,
  instagram: fetchRecentInstagramMedia,
  spotify: getSpotifyWidgetContent
}

const getWidgetContent = async ({ context, req }) => {
  const {
    query: { widget }
  } = req

  if (!widgetHandlerRegistry[widget]) {
    throw new Error(`Unrecognized widget type: ${widget}`)
  }

  const getContent = widgetHandlerRegistry[widget]
  const widgetContent = await getContent({ context })

  return widgetContent
}

module.exports = getWidgetContent
