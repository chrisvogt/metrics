import got from 'got'

import { getInstagramAccessToken, getInstagramUserId } from '../../config/backend-config.js'

const INSTAGRAM_API_VERSION = 'v25.0'
const INSTAGRAM_BASE_URL = 'https://graph.instagram.com'
const MAX_TOP_LEVEL_MEDIA_ITEMS = 24

const profileFields =
  'id,user_id,username,account_type,profile_picture_url,followers_count,follows_count,media_count'
const mediaFields =
  'alt_text,caption,children{alt_text,id,media_url,thumbnail_url},comments_count,id,ig_id,like_count,media_type,media_url,permalink,thumbnail_url,timestamp,username'

const fetchInstagramMedia = async () => {
  const accessToken = getInstagramAccessToken()
  const instagramUserId = getInstagramUserId()

  if (!accessToken) {
    throw new Error('Missing INSTAGRAM_ACCESS_TOKEN environment variable.')
  }

  if (!instagramUserId) {
    throw new Error('Missing INSTAGRAM_USER_ID environment variable.')
  }

  const [{ body: profileBody }, { body: mediaBody }] = await Promise.all([
    got(`${INSTAGRAM_BASE_URL}/${INSTAGRAM_API_VERSION}/me?access_token=${accessToken}&fields=${profileFields}`, {
      responseType: 'json',
    }),
    got(
      `${INSTAGRAM_BASE_URL}/${INSTAGRAM_API_VERSION}/${instagramUserId}/media?access_token=${accessToken}&limit=${MAX_TOP_LEVEL_MEDIA_ITEMS}&fields=${mediaFields}`,
      {
      responseType: 'json',
      }
    ),
  ])

  return {
    ...(profileBody as Record<string, unknown>),
    media: mediaBody,
  }
}

export default fetchInstagramMedia
