import got from 'got';
const ENDPOINT = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/';
const getOwnedGames = async (apiKey, userId) => {
    const { body } = await got(ENDPOINT, {
        responseType: 'json',
        searchParams: {
            key: apiKey,
            steamid: userId,
            include_appinfo: true
        },
    });
    if (body == null || typeof body !== 'object') {
        throw new Error('Invalid response');
    }
    const response = body?.response ?? {};
    return response;
};
export default getOwnedGames;
//# sourceMappingURL=get-owned-games.js.map