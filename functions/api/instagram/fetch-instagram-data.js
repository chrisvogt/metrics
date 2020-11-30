const functions = require('firebase-functions')
const got = require('got')

const defaultFields = [
  'account_type',
  'id',
  'username',
  'media_count',
  'media{caption,id,ig_id,media_type,like_count,comments_count,media_url,permalink,thumbnail_url,timestamp,username}'
]

const INSTAGRAM_BASE_URL = 'https://graph.instagram.com';

const fetchInstagramMedia = async () => {
  const {
    instagram: {
      user_id: userId,
      access_token: accessToken
    } = {}
  } = functions.config()

  const { body } = await got(userId, {
    responseType: 'json',
    prefixUrl: INSTAGRAM_BASE_URL,
    searchParams: {
      access_token: accessToken,
      fields: defaultFields.join(',')
    }
  })

  return body;
}

module.exports = fetchInstagramMedia
