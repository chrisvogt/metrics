import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from 'firebase-functions'
import extractJsonFromGeminiResponse from '../../lib/extract-json-from-gemini-response.js'

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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const { collections, profile, metrics } = steamData

  const prompt = `
Hi — please analyze the following Steam gaming data and return a natural-sounding summary in **valid JSON**.

Use this structure:
{
  "response": "<2-3 paragraphs in limited HTML with third-person summary of Chris Vogt's Steam activity. Mention recent games played, genre or playstyle trends, and any standout titles. Use natural and informative language.>",
  "debug": {
    "recentlyPlayedGames": [...], // title, playTime2Weeks, playTimeForever
    "topPlayedGames": [...]       // title, playTimeForever
  }
}

Instructions:
- Respond in HTML with each paragraph in a <p> tag
- No need to wrap the response in a <div> tag or any other container tags
– Try to generate 2 paragraphs, at most 3
- You are encouraged to use HTML tags to format the text
- Especially basic formatting like <b>, <i>, <strong>, <em> and other simple formatting tags
- Please do not use hyperlinks
– Your response will be rendered next to a table showing recent and total hours for each game...
- ...so no need to mention the exact hours in your response
- All provided time values are in **minutes**
- If time > 60 minutes, convert to **hours**, rounded to 1 decimal (e.g. 75 → "1.3 hours")
- If time < 60 minutes, keep in **minutes**
- Exclude games with 0 total playtime
- Refer to the player as “Chris”
- Identify genre or gameplay patterns if possible (e.g. sandbox, survival, RPGs, base-building)
- Return only **valid JSON** — no markdown or extra text

Steam Profile: ${profile.displayName}  
Total Games Owned: ${metrics.find(m => m.id === 'owned-games-count')?.value || 0}

"recentlyPlayedGames": ${JSON.stringify(collections.recentlyPlayedGames.map(game => ({
    title: game.displayName,
    playTime2Weeks: game.playTime2Weeks || 0,
    playTimeForever: game.playTimeForever || 0
  })))}

"topPlayedGames": ${JSON.stringify(collections.ownedGames
    .filter(game => game.playTimeForever >= 100)
    .sort((a, b) => b.playTimeForever - a.playTimeForever)
    .map(game => ({
      title: game.displayName,
      playTimeForever: game.playTimeForever
    })))}
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const parsed = extractJsonFromGeminiResponse(response.text())
    if (!parsed) {
      throw new Error('Gemini response was not valid JSON (no markdown block or raw JSON)')
    }
    const { response: sanitizedResponse = '' } = parsed
    return sanitizedResponse
  } catch (error) {
    logger.error('Error generating Steam summary with Gemini:', error)
    throw new Error(`Failed to generate AI summary: ${error.message}`, { cause: error })
  }
}

export default generateSteamSummary
