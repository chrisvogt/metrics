import { GoogleGenerativeAI } from '@google/generative-ai'

const extractJsonFromMarkdown = str => {
  const match = str.match(/```json\s*({[\s\S]*?})\s*```/);
  return match ? JSON.parse(match[1]) : null;
}

/**
 * Generate AI summary of Steam gaming data using Gemini
 * @param {Object} steamData - The Steam data object containing collections and profile info
 * @returns {Promise<string>} - The AI-generated summary
 */
const generateSteamSummary = async (steamData) => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const { collections, profile, metrics } = steamData

  const prompt = `
Hi there — can you take the following Steam gaming data and return a natural-sounding summary as a JSON object?

Use this structure:

- "response": a short, scannable summary of Chris’s Steam gaming activity in 1–2 short paragraphs or bullets.
- "debug": a breakdown of key facts (e.g., most played games, recent activity, notable genres). Include the following keys:
  - "recentlyPlayedGames"
  - "topPlayedGames"

Please note:
- All playtime values below are in **minutes**.
- Use **hours** for values over 60 min (1 hour), rounded to 1 decimal place.
- For values under 60 min, just display in minutes.
- Do not include games with 0 total minutes.
- Please return only valid JSON. No markdown or extra text.
- Refer to me as “Chris.”

Steam Profile: ${profile.displayName}  
Total Games Owned: ${metrics.find(m => m.id === 'owned-games-count')?.value || 0}

"recentlyPlayedGames": ${JSON.stringify(collections.recentlyPlayedGames.map(game => ({
    title: game.displayName,
    playTime2Weeks: game.playTime2Weeks || 0,
    playTimeForever: game.playTimeForever || 0
  })))}

"topPlayedGames": ${JSON.stringify(collections.ownedGames
    .filter(game => game.playTimeForever >= 100)
    .map(game => ({
      title: game.displayName,
      playTimeForever: game.playTimeForever
    })))}
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const { debug, response: sanitizedResponse = '' } = extractJsonFromMarkdown(response.text())
    console.debug('Steam Summary [Gemini] Debug', debug)
    return sanitizedResponse
  } catch (error) {
    console.error('Error generating Steam summary with Gemini:', error)
    throw new Error(`Failed to generate AI summary: ${error.message}`)
  }
}

export default generateSteamSummary 