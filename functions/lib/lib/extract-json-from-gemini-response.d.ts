/**
 * Parse JSON from a Gemini API response.
 * Handles both markdown-wrapped (```json ... ```) and raw JSON, since the API
 * may return either format depending on model/config.
 *
 * @param {string} str - Raw response text from response.text()
 * @returns {Object|null} - Parsed object with .response and optional .debug, or null
 */
declare const extractJsonFromGeminiResponse: (str: any) => any;
export default extractJsonFromGeminiResponse;
//# sourceMappingURL=extract-json-from-gemini-response.d.ts.map