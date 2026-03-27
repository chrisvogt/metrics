import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from 'firebase-functions'

import { getGeminiApiKey } from '../../config/backend-config.js'
import extractJsonFromGeminiResponse from '../../utils/extract-json-from-gemini-response.js'

import type { GoodreadsAiReadShelfEntry } from '../../types/goodreads.js'
import type { GoodreadsWidgetDocument } from '../../types/widget-content.js'

export type GenerateGoodreadsSummaryOptions = {
  /** Full read shelf from Goodreads XML only; drives long-tail context in the prompt */
  fullReadShelf?: GoodreadsAiReadShelfEntry[]
}

type GeminiGoodreadsSummaryJson = {
  response?: string
  debug?: Record<string, unknown>
}

/** UI on chrisvogt.me expects exactly two <p> blocks side by side with the book list */
const extractParagraphTags = (html: string): string[] => {
  const re = /<p\b[^>]*>[\s\S]*?<\/p>/gi
  return html.match(re) ?? []
}

const ensureTwoParagraphSummary = (html: string): string => {
  const paras = extractParagraphTags(html)
  if (paras.length === 0) {
    return html.trim()
  }
  if (paras.length === 1) {
    logger.warn('Goodreads AI summary contained only one <p>; homepage layout expects two.')
    return paras[0]
  }
  if (paras.length > 2) {
    logger.info(`Goodreads AI summary had ${paras.length} <p> tags; using the first two for the widget.`)
    return paras[0] + paras[1]
  }
  return paras[0] + paras[1]
}

/**
 * Generate AI summary of Goodreads reading data using Gemini
 * @param {Object} goodreadsData - The Goodreads data object containing collections and profile info
 * @returns {Promise<string>} - The AI-generated summary
 */
const generateGoodreadsSummary = async (
  goodreadsData: GoodreadsWidgetDocument,
  options: GenerateGoodreadsSummaryOptions = {},
): Promise<string> => {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const { collections, profile } = goodreadsData
  const { fullReadShelf = [] } = options

  const fullShelfForPrompt =
    fullReadShelf.length > 0
      ? fullReadShelf
      : (collections?.recentlyReadBooks?.map((book) => ({
          title: book.title,
          authors: book.authors ?? [],
          isbn: book.isbn ?? null,
          rating: book.rating ?? null,
          finishedOrAddedDate: null,
        })) ?? [])

  const prompt = `
You are writing a short, reader-facing “AI reading summary” for Chris Vogt’s personal homepage (chrisvogt.me). It appears next to a live list of books he recently finished and what he is reading now, so visitors already see titles and ratings there.

Return **valid JSON only** (no markdown fences, no commentary) using this shape:
{
  "response": "<string: exactly two HTML paragraphs, see rules below>",
  "debug": {
    "recentlyReadBooks": [...],
    "readingPatterns": [...]
  }
}

Rules for the "response" string (strict — the UI is built for this):
- **Exactly two** <p>...</p> elements, back-to-back, with nothing before, between, or after them (no wrapper <div>, no line breaks outside the tags).
- **Third person** only, referring to him as **Chris** (e.g. “Chris tends to…”, “He often…”). Never “I”, “you”, or “the reader”.
- Tone: calm, specific, a little editorial — like a sharp one-column blurb in a magazine, not marketing fluff. Avoid generic openers (“Chris loves books”, “As an avid reader”).
- **Do not** repeat or enumerate the book list; at most **one** quick nod to a title or theme if it sharpens a point. Ratings are visible elsewhere — mention them only if unusual or telling.
- **completeReadShelf** is his full “read” shelf from Goodreads (title, authors, ISBN, his stars, finish or date-added). Use it for **long-run habits**: balance of fiction vs non-fiction, streaks, eras, breadth, how tastes shift over time.
- **recentlyReadBooksForWidget** adds categories and page counts (via Google Books) for what the page actually shows — use it for **texture on what he’s been into lately** (subjects, chunkier vs slimmer books) without re-listing every title.

Styling inside paragraphs (optional, sparse):
- You may use **bold or italic** (<strong>, <em>) for a phrase or two; no hyperlinks, no lists, no headings, no images.

Goodreads Profile: ${profile?.name || profile?.username || 'Chris Vogt'}

"recentlyReadBooksForWidget": ${JSON.stringify(collections?.recentlyReadBooks?.map(book => ({
    title: book.title,
    authors: book.authors,
    rating: book.rating,
    categories: book.categories || [],
    pageCount: book.pageCount
  })) || [])}

"completeReadShelf": ${JSON.stringify(fullShelfForPrompt)}
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const parsed = extractJsonFromGeminiResponse<GeminiGoodreadsSummaryJson>(response.text())
    if (!parsed) {
      throw new Error('Gemini response was not valid JSON (no markdown block or raw JSON)')
    }
    const { response: sanitizedResponse = '' } = parsed
    return ensureTwoParagraphSummary(sanitizedResponse)
  } catch (error) {
    logger.error('Error generating Goodreads summary with Gemini:', error)
    throw new Error(`Failed to generate AI summary: ${error.message}`, { cause: error })
  }
}

export default generateGoodreadsSummary
