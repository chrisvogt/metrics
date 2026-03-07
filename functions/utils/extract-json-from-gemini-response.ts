/**
 * Parse JSON from a Gemini API response.
 * Handles both markdown-wrapped (```json ... ```) and raw JSON, since the API
 * may return either format depending on model/config.
 *
 * @param {string} str - Raw response text from response.text()
 * @returns {Object|null} - Parsed object with .response and optional .debug, or null
 */
const extractJsonFromGeminiResponse = (str) => {
  if (typeof str !== 'string' || !str.trim()) {
    return null
  }

  // 1. Try markdown code block (historical format)
  const markdownMatch = str.match(/```json\s*({[\s\S]*?})\s*```/)
  if (markdownMatch) {
    try {
      return JSON.parse(markdownMatch[1])
    } catch {
      return null
    }
  }

  // 2. Try parsing the whole string as JSON (e.g. response_mime_type: application/json)
  try {
    const parsed = JSON.parse(str)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export default extractJsonFromGeminiResponse
