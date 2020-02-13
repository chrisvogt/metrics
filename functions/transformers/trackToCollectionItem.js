const trackToCollectionItem = item => {
  const {
    album: { images: albumImages = [] },
    artists,
    external_urls: { spotify: spotifyURL } = {},
    id,
    name,
    preview_url: previewURL,
    type,
    uri
  } = item

  return {
    albumImages,
    artists: artists.map(({ name }) => name),
    id,
    name,
    previewURL,
    spotifyURL,
    type,
    uri
  }
}

module.exports = trackToCollectionItem
