import { describe, it, expect } from 'vitest'
import extractJsonFromGeminiResponse from './extract-json-from-gemini-response.js'

describe('extractJsonFromGeminiResponse', () => {
  it('parses markdown-wrapped JSON', () => {
    const str = `\`\`\`json
{ "response": "<p>Hi</p>", "debug": {} }
\`\`\``
    const result = extractJsonFromGeminiResponse(str)
    expect(result).toEqual({ response: '<p>Hi</p>', debug: {} })
  })

  it('returns null when markdown block contains invalid JSON', () => {
    const str = '```json\n{ invalid }\n```'
    const result = extractJsonFromGeminiResponse(str)
    expect(result).toBeNull()
  })

  it('parses raw JSON when no markdown block', () => {
    const str = '{"response": "<p>Raw</p>", "debug": {"key": "value"}}'
    const result = extractJsonFromGeminiResponse(str)
    expect(result).toEqual({ response: '<p>Raw</p>', debug: { key: 'value' } })
  })

  it('returns null for plain text', () => {
    expect(extractJsonFromGeminiResponse('Just plain text')).toBeNull()
  })

  it('returns null for empty or invalid input', () => {
    expect(extractJsonFromGeminiResponse('')).toBeNull()
    expect(extractJsonFromGeminiResponse('   ')).toBeNull()
    expect(extractJsonFromGeminiResponse('not json')).toBeNull()
  })
})
