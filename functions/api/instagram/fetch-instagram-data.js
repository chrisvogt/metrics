const functions = require('firebase-functions/v1')
const got = require('got')

const defaultFields = [
  'account_type',
  'id',
  'username',
  'media_count',
  'media{caption,children{id,media_url,thumbnail_url},id,ig_id,media_type,media_url,permalink,thumbnail_url,timestamp,username}'
]

const INSTAGRAM_BASE_URL = 'https://graph.instagram.com'

const fetchInstagramMedia = async () => {
  const {
    instagram: {
      access_token: accessToken
    } = {}
  } = functions.config()

  const { body } = await got('me', {
    responseType: 'json',
    prefixUrl: INSTAGRAM_BASE_URL,
    searchParams: {
      access_token: accessToken,
      fields: defaultFields.join(',')
    }
  })

  return body
}

module.exports = fetchInstagramMedia
