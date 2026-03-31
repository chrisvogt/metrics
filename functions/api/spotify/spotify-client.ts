import got from 'got'

const spotifyClient = got.extend({
  prefixUrl: 'https://api.spotify.com/v1',
  responseType: 'json',
  retry: {
    limit: 2,
    methods: ['GET'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
    errorCodes: ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED']
  }
})

export default spotifyClient
