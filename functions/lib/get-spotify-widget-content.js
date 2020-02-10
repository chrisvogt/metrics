const getUserProfile = require('../api/spotify/get-user-profile');
const getTopTracks = require('../api/spotify/get-top-tracks');

const trackToCollectionItem = require('../transformers/trackToCollectionItem');

// NOTE(cvogt): this widget content handler is returning what I'm testing as a
// new common schema for widget content.
const getSpotifyWidgetContent = async () => {
  // NOTE(cvogt): these are mocked for development
  const playlistsCount = 61;
  const profile = await getUserProfile();
  const topTracks = await getTopTracks();

  return {
    collections: {
      topTracks: topTracks.map(trackToCollectionItem)
    },
    metrics: [
      {
        displayName: 'Followers',
        id: 'followers-count',
        value: profile.followers.total
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
  };
};

module.exports = getSpotifyWidgetContent;
