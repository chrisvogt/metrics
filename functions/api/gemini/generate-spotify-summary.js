import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from 'firebase-functions'

const extractJsonFromMarkdown = (str) => {
  const match = str.match(/```json\s*({[\s\S]*?})\s*```/)
  return match ? JSON.parse(match[1]) : null
}

/**
 * Generate AI summary of Spotify music data using Gemini
 * @param {Object} spotifyData - The Spotify data object containing collections and profile info
 * @returns {Promise<string>} - The AI-generated summary
 */
const generateSpotifySummary = async (spotifyData) => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const { collections, profile, metrics } = spotifyData

  const prompt = `
Hi — please analyze the following Spotify music data and return a natural-sounding summary in **valid JSON**.

Use this structure:
{
  "response": "<2-3 paragraphs in limited HTML with third-person summary of Chris Vogt's Spotify listening activity. Mention top tracks, artists, musical preferences, playlist creation habits, and any standout patterns. Use natural and informative language.>",
  "debug": {
    "topTracks": [...], // track name, artists, genres
    "topArtists": [...], // unique artists from top tracks
    "playlistInsights": [...], // playlist count, themes, variety
    "musicalPreferences": [...]  // genre analysis, popularity trends
  }
}

Instructions:
- You are being passed my most-played Spotify tracks over the last 2 weeks, and a limited set of my playlists
- So, know you are summarizing a segment of my Spotify activity, and don't have access to my entire history
- Respond in HTML with each paragraph in a <p> tag
- No need to wrap the response in a <div> tag or any other container tags
– Try to generate 2 paragraphs, at most 3
- You are encouraged to use HTML tags to format the text, especially basic formatting like <b>, <i>, <strong>, <em> and other simple formatting tags
- Please do not use hyperlinks
– Your response will be rendered next to tables showing top tracks and playlists...
- ...so no need to repeat exact track names unless particularly noteworthy
- Refer to the listener as "Chris"
- Identify musical genres, artist preferences, or listening patterns if possible
- Mention playlist creation habits and variety, or at least as much as you can with the provided data
- Focus on musical taste, diversity, and any interesting patterns
- Return only **valid JSON** — no markdown or extra text

Spotify Profile: ${profile?.displayName || 'Chris'}
Followers: ${profile?.followersCount || 0}
Total Playlists: ${metrics?.find((m) => m.id === 'playlists-count')?.value || 0}

"topTracks": ${JSON.stringify(
    collections?.topTracks?.map((track) => ({
      name: track.name,
      artists: track.artists || [],
      album: track.album?.name,
      explicit: track.explicit,
      duration_ms: track.duration_ms,
      genres: track.genres || [],
    })) || []
  )}

"playlists": ${JSON.stringify(
    collections?.playlists?.map((playlist) => ({
      name: playlist.name,
      description: playlist.description,
      public: playlist.public,
      collaborative: playlist.collaborative,
      tracks: {
        total: playlist.tracks?.total || 0,
      },
      owner: playlist.owner?.display_name,
    })) || []
  )}

"profileData": ${JSON.stringify({
    displayName: profile?.displayName,
    followersCount: profile?.followersCount,
    id: profile?.id,
    profileURL: profile?.profileURL,
  })}
`

  logger.debug('Spotify Summary [Gemini] Prompt', prompt)

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const { debug, response: sanitizedResponse = '' } = extractJsonFromMarkdown(
      response.text()
    )
    logger.debug('Spotify Summary [Gemini] Debug', debug)
    return sanitizedResponse
  } catch (error) {
    logger.error('Error generating Spotify summary with Gemini:', error)
    throw new Error(`Failed to generate AI summary: ${error.message}`)
  }
}

export default generateSpotifySummary
