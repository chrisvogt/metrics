const getUserProfile = require('../api/spotify/get-user-profile');
const getTopTracks = require('../api/spotify/get-top-tracks');

const getSpotifyWidgetContent = async () => {

    // NOTE(cvogt): these are stubbed until a mechanism for getting and storing
    // provider access tokens has been built
    const profile = await getUserProfile();
    const topTracks = await getTopTracks()

    return {
        profile,
        topTracks
    };
};

module.exports = getSpotifyWidgetContent;
