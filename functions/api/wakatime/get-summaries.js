import request from 'requestretry'

const getSummaries = async (queryParams, options) => {
  const { accessToken } = options

  if (!accessToken) {
    throw new Error('An access token is required to call the WakaTime API.')
  }

  try {
    const { data: summaries = [] } = await request({
      fullResponse: false,
      headers: { Authorization: `Basic ${accessToken}` },
      json: true,
      qs: queryParams,
      retryStrategy: err => !!err,
      uri: 'https://wakatime.com/api/v1/users/current/summaries'
    })

    return {
      ok: true,
      summaries
    }
  } catch (error) {
    const { message } = error
    return {
      ok: false,
      error: message
    }
  }
}

export default getSummaries
