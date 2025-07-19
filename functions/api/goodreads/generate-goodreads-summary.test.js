import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import generateGoodreadsSummary from './generate-goodreads-summary.js'

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn()
    }))
  }))
}))

// Mock firebase functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}))

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from 'firebase-functions'

describe('generateGoodreadsSummary', () => {
  let mockGenerateContent
  let mockGetGenerativeModel
  let mockGoogleGenerativeAI
  
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset environment
    process.env = { ...originalEnv }
    
    mockGenerateContent = vi.fn()
    mockGetGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }))
    mockGoogleGenerativeAI = vi.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }))
    
    GoogleGenerativeAI.mockImplementation(mockGoogleGenerativeAI)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should throw error when GEMINI_API_KEY is not provided', async () => {
    delete process.env.GEMINI_API_KEY

    await expect(generateGoodreadsSummary({})).rejects.toThrow(
      'GEMINI_API_KEY environment variable is required'
    )
  })

  it('should generate AI summary successfully', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    const mockGoodreadsData = {
      collections: {
        recentlyReadBooks: [
          {
            title: 'The Great Gatsby',
            authors: ['F. Scott Fitzgerald'],
            rating: 4,
            categories: ['Fiction', 'Classic'],
            pageCount: 180
          },
          {
            title: 'Sapiens',
            authors: ['Yuval Noah Harari'],
            rating: 5,
            categories: ['Non-fiction', 'History'],
            pageCount: 443
          }
        ]
      },
      profile: {
        displayName: 'Chris Vogt'
      }
    }

    const mockResponseText = `\`\`\`json
{
  "response": "<p>Chris has been exploring a diverse range of literature lately.</p><p>Recent reads include both classic fiction and contemporary non-fiction.</p>",
  "debug": {
    "recentlyReadBooks": [{"title": "The Great Gatsby", "authors": ["F. Scott Fitzgerald"], "rating": 4}],
    "readingPatterns": ["fiction", "non-fiction"]
  }
}
\`\`\``

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText
      }
    })

    const result = await generateGoodreadsSummary(mockGoodreadsData)

    expect(result).toBe('<p>Chris has been exploring a diverse range of literature lately.</p><p>Recent reads include both classic fiction and contemporary non-fiction.</p>')
    
    // Verify Google AI was initialized correctly
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-api-key')
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-1.5-flash' })
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('please analyze the following Goodreads reading data'))
    
    // Verify debug logging
    expect(logger.debug).toHaveBeenCalledWith('Goodreads Summary [Gemini] Debug', {
      recentlyReadBooks: [{'title': 'The Great Gatsby', 'authors': ['F. Scott Fitzgerald'], 'rating': 4}],
      readingPatterns: ['fiction', 'non-fiction']
    })
  })

  it('should handle missing collections gracefully', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    const mockGoodreadsData = {
      profile: {
        displayName: 'Chris Vogt'
      }
    }

    const mockResponseText = `\`\`\`json
{
  "response": "<p>Chris's reading activity data is currently unavailable.</p>",
  "debug": {
    "recentlyReadBooks": [],
    "readingPatterns": []
  }
}
\`\`\``

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText
      }
    })

    const result = await generateGoodreadsSummary(mockGoodreadsData)

    expect(result).toBe('<p>Chris\'s reading activity data is currently unavailable.</p>')
    
    // Verify prompt includes empty arrays for missing data
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('"recentlyReadBooks": []'))
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('"allBooks": []'))
  })

  it('should handle missing profile gracefully', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    const mockGoodreadsData = {
      collections: {
        recentlyReadBooks: []
      }
    }

    const mockResponseText = `\`\`\`json
{
  "response": "<p>Reading activity summary unavailable.</p>",
  "debug": {}
}
\`\`\``

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText
      }
    })

    const result = await generateGoodreadsSummary(mockGoodreadsData)

    expect(result).toBe('<p>Reading activity summary unavailable.</p>')
    
    // Verify default profile name is used
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('Chris Vogt'))
  })

  it('should handle malformed JSON response', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    const mockGoodreadsData = {
      collections: { recentlyReadBooks: [] },
      profile: { displayName: 'Chris Vogt' }
    }

    const mockResponseText = `\`\`\`json
{ invalid json here
\`\`\``

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText
      }
    })

    await expect(generateGoodreadsSummary(mockGoodreadsData)).rejects.toThrow('Failed to generate AI summary')
    expect(logger.error).toHaveBeenCalledWith('Error generating Goodreads summary with Gemini:', expect.any(Error))
  })

  it('should handle response without JSON markdown blocks', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    const mockGoodreadsData = {
      collections: { recentlyReadBooks: [] },
      profile: { displayName: 'Chris Vogt' }
    }

    const mockResponseText = 'Just plain text without JSON blocks'

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText
      }
    })

    await expect(generateGoodreadsSummary(mockGoodreadsData)).rejects.toThrow('Failed to generate AI summary')
  })

  it('should handle Google AI API errors', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    const mockGoodreadsData = {
      collections: { recentlyReadBooks: [] },
      profile: { displayName: 'Chris Vogt' }
    }

    const apiError = new Error('API quota exceeded')
    mockGenerateContent.mockRejectedValue(apiError)

    await expect(generateGoodreadsSummary(mockGoodreadsData)).rejects.toThrow('Failed to generate AI summary: API quota exceeded')
    expect(logger.error).toHaveBeenCalledWith('Error generating Goodreads summary with Gemini:', apiError)
  })

  it('should handle response missing required fields', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    const mockGoodreadsData = {
      collections: { recentlyReadBooks: [] },
      profile: { displayName: 'Chris Vogt' }
    }

    const mockResponseText = `\`\`\`json
{
  "debug": {
    "recentlyReadBooks": []
  }
}
\`\`\``

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText
      }
    })

    const result = await generateGoodreadsSummary(mockGoodreadsData)

    // Should return empty string when response field is missing
    expect(result).toBe('')
  })

  it('should include comprehensive book data in prompt', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    const mockGoodreadsData = {
      collections: {
        recentlyReadBooks: [
          {
            title: 'Dune',
            authors: ['Frank Herbert'],
            rating: 5,
            categories: ['Science Fiction'],
            pageCount: 688
          }
        ]
      },
      profile: {
        displayName: 'Test User'
      }
    }

    const mockResponseText = `\`\`\`json
{
  "response": "<p>Test summary</p>",
  "debug": {}
}
\`\`\``

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText
      }
    })

    await generateGoodreadsSummary(mockGoodreadsData)

    const promptCall = mockGenerateContent.mock.calls[0][0]
    
    // Verify all book data is included in prompt
    expect(promptCall).toContain('"title":"Dune"')
    expect(promptCall).toContain('"authors":["Frank Herbert"]')
    expect(promptCall).toContain('"rating":5')
    expect(promptCall).toContain('"categories":["Science Fiction"]')
    expect(promptCall).toContain('"pageCount":688')
    
    // Verify prompt contains instructions
    expect(promptCall).toContain('please analyze the following Goodreads reading data')
    expect(promptCall).toContain('return a natural-sounding summary')
    expect(promptCall).toContain('Refer to the reader as "Chris"')
  })
}) 