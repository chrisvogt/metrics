const got = require('got')

const defaultFields = [
  'account_type',
  'biography',
  'followers_count',
  'id',
  'media_count',
  'media{caption,children{id,media_url,thumbnail_url},id,ig_id,media_type,media_url,permalink,thumbnail_url,timestamp,username}',
  'username',
]

const INSTAGRAM_BASE_URL = 'https://graph.instagram.com'

const fetchInstagramMedia = async () => {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN

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
