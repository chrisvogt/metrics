import got from 'got';
const ENDPOINT = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/';
const getPlayerSummary = async (apiKey, userId) => {
    const { body } = await got(ENDPOINT, {
        responseType: 'json',
        searchParams: {
            key: apiKey,
            steamids: userId,
        },
    });
    if (body == null || typeof body !== 'object') {
        throw new Error('Invalid response');
    }
    const response = body?.response;
    const players = response?.players ?? [];
    const player = players[0];
    return player ? player : [];
};
export default getPlayerSummary;
//# sourceMappingURL=get-player-summary.js.map