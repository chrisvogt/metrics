import got from 'got'

import { getInstagramAccessToken } from '../../config/backend-config.js'

const INSTAGRAM_API_VERSION = 'v25.0'
const INSTAGRAM_BASE_URL = 'https://graph.instagram.com'

const fields = [
  'account_type',
  'biography',
  'followers_count',
  'id',
  'media_count',
  'media{alt_text,caption,children{alt_text,id,media_url,thumbnail_url},comments_count,id,ig_id,like_count,media_type,media_url,permalink,thumbnail_url,timestamp,username}',
  'username',
]

const fetchInstagramMedia = async (instagramUserId: string) => {
  const accessToken = getInstagramAccessToken()

  const { body } = await got(`${INSTAGRAM_API_VERSION}/${instagramUserId}`, {
    responseType: 'json',
    prefixUrl: INSTAGRAM_BASE_URL,
    searchParams: {
      access_token: accessToken,
      fields: fields.join(','),
    },
  })

  return body
}

export default fetchInstagramMedia
