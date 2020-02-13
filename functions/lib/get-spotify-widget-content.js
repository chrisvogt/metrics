const getUserProfile = require('../api/spotify/get-user-profile')
const getTopTracks = require('../api/spotify/get-top-tracks')

const trackToCollectionItem = require('../transformers/trackToCollectionItem')

// NOTE(cvogt): this widget content handler is returning what I'm testing as a
// new common schema for widget content.
//
// TODO: refactor to use selectors
const getSpotifyWidgetContent = async () => {
  const profile = await getUserProfile()
  const topTracks = await getTopTracks()

  // NOTE(cvogt): these values are hard-coded until access token support is
  // available to fetch fresh data
  const followersCount = profile.followers.total
  const playlistsCount = 52

  return {
    collections: {
      topTracks: topTracks.map(trackToCollectionItem)
    },
    metrics: [
      {
        displayName: 'Followers',
        id: 'followers-count',
        value: followersCount
      },
      {
        displayName: 'Playlists',
        id: 'playlists-count',
        value: playlistsCount
      }
    ],
    provider: {
      displayName: 'Spotify',
      id: 'spotify'
    },
    profile: {
      avatarURL: profile.images[0].url,
      displayName: profile.display_name,
      profileURL: profile.external_urls.spotify
    }
  }
}

module.exports = getSpotifyWidgetContent
