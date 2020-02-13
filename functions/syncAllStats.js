const request = require('requestretry')

const statsList = ['last_7_days', 'last_30_days']

const syncAllStats = ({ config, database }) => async () => {
  const baseUrl = `https://wakatime.com/api/v1/users/${config.wakatime.username}`
  const endpoint = '/stats'

  const retryOnPending = (err, response, body) => {
    const { data: { status } = {} } = body
    return Bool(err) || status !== 'ok'
  }

  const statsPromises = statsList.map(async range => {
    const sixtySecondsInMs = 60000
    const response = await request({
      fullResponse: true,
      headers: { Authorization: `Basic ${config.wakatime.access_token}` },
      json: true,
      retryDelay: sixtySecondsInMs,
      retryStrategy: retryOnPending,
      uri: baseUrl + endpoint + `/${range}`
    })
    const { body: { data = {} } = {} } = response
    return data
  })

  const results = await Promise.all(statsPromises)
  const resultList = statsList.map((key, index) => {
    return {
      name: key,
      value: results[index]
    }
  })

  resultList.forEach(async ({ name, value }) => {
    const docRef = database.collection('stats').doc(name)
    await docRef.set({
      timestamp: Date.now(),
      data: value
    })
  })

  return resultList
}

module.exports = syncAllStats
