import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from 'firebase-functions'
import extractJsonFromGeminiResponse from '../../lib/extract-json-from-gemini-response.js'

/**
 * Generate AI summary of Goodreads reading data using Gemini
 * @param {Object} goodreadsData - The Goodreads data object containing collections and profile info
 * @returns {Promise<string>} - The AI-generated summary
 */
const generateGoodreadsSummary = async (goodreadsData) => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const { collections, profile } = goodreadsData

  const prompt = `
Hi — please analyze the following Goodreads reading data and return a natural-sounding summary in **valid JSON**.

Use this structure:
{
  "response": "<2-3 paragraphs in limited HTML with third-person summary of Chris Vogt's reading activity. Mention recent books read, genre preferences or reading patterns, and any standout titles. Use natural and informative language.>",
  "debug": {
    "recentlyReadBooks": [...], // title, authors, rating, categories
    "readingPatterns": [...]    // genre analysis, rating trends, etc.
  }
}

Instructions:
- Respond in HTML with each paragraph in a <p> tag
- No need to wrap the response in a <div> tag or any other container tags
– Try to generate 2 paragraphs, at most 3
- You are encouraged to use HTML tags to format the text
- Especially basic formatting like <b>, <i>, <strong>, <em> and other simple formatting tags
- Please do not use hyperlinks
– Your response will be rendered next to a table showing recent books and ratings...
- ...so no need to mention the exact ratings in your response unless particularly noteworthy
- Refer to the reader as "Chris"
- Identify genre preferences or reading patterns if possible (e.g. fiction, non-fiction, sci-fi, biography, technical books)
- Mention any standout high-rated books or interesting genre diversity
- Focus on recent reading activity and overall patterns
- Return only **valid JSON** — no markdown or extra text

Goodreads Profile: ${profile?.displayName || 'Chris Vogt'}

"recentlyReadBooks": ${JSON.stringify(collections?.recentlyReadBooks?.map(book => ({
    title: book.title,
    authors: book.authors,
    rating: book.rating,
    categories: book.categories || [],
    pageCount: book.pageCount
  })) || [])}

"allBooks": ${JSON.stringify(collections?.recentlyReadBooks?.map(book => ({
    title: book.title,
    authors: book.authors,
    rating: book.rating,
    categories: book.categories || []
  })) || [])}
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
    logger.error('Error generating Goodreads summary with Gemini:', error)
    throw new Error(`Failed to generate AI summary: ${error.message}`)
  }
}

export default generateGoodreadsSummary
