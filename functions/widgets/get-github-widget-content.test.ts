import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fs - need to provide default return value since it's called at module load time
vi.mock('fs', () => {
  return {
    default: {
      readFileSync: vi.fn(() => `query GitHubWidgetQuery($username: String!) {
  user(login: $username) {
    login
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            color
          }
        }
      }
    }
  }
}`)
    }
  }
})

vi.mock('got', () => ({
  default: {
    post: vi.fn(),
  },
}))

// Mock path and url modules
vi.mock('path', () => ({
  default: {
    resolve: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/'))
  }
}))

vi.mock('url', () => ({
  fileURLToPath: vi.fn((url) => url.replace('file://', ''))
}))

vi.mock('../services/github-integration-credentials.js', () => ({
  loadGitHubAuthForUser: vi.fn().mockResolvedValue(null),
}))

import type { DocumentStore } from '../ports/document-store.js'
import getGitHubWidgetContent from './get-github-widget-content.js'
import { loadGitHubAuthForUser } from '../services/github-integration-credentials.js'
import got from 'got'
import fs from 'fs'

describe('getGitHubWidgetContent', () => {
  const originalEnv = process.env
  const documentStore = {
    getDocument: vi.fn(),
    setDocument: vi.fn(),
  } as unknown as DocumentStore

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadGitHubAuthForUser).mockResolvedValue(null)
    process.env = {
      ...originalEnv,
      GITHUB_ACCESS_TOKEN: 'test-token',
      GITHUB_USERNAME: 'testuser'
    }
    
    // Reset the mock to return the query
    fs.readFileSync.mockReturnValue(`query GitHubWidgetQuery($username: String!) {
  user(login: $username) {
    login
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            color
          }
        }
      }
    }
  }
}`)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should fetch GitHub widget content successfully', async () => {
    const mockResponse = {
      body: {
        user: {
          login: 'testuser',
          name: 'Test User',
          bio: 'Test bio',
          followers: { totalCount: 100 },
          following: { totalCount: 50 },
          url: 'https://github.com/testuser',
          avatarUrl: 'https://github.com/testuser.png',
          repositories: { totalCount: 25 },
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 1500,
              weeks: [
                {
                  contributionDays: [
                    {
                      date: '2024-01-01',
                      contributionCount: 5,
                      color: '#c6e48b'
                    },
                    {
                      date: '2024-01-02',
                      contributionCount: 3,
                      color: '#7bc96f'
                    }
                  ]
                }
              ]
            }
          },
          pinnedItems: {
            totalCount: 6,
            nodes: []
          },
          pullRequests: {
            nodes: []
          }
        }
      }
    }

    vi.mocked(got.post).mockResolvedValue({ body: { data: mockResponse.body } } as never)

    const result = await getGitHubWidgetContent('u1', documentStore)

    expect(got.post).toHaveBeenCalledWith(
      'https://api.github.com/graphql',
      expect.objectContaining({
        json: expect.objectContaining({
          query: expect.stringContaining('contributionsCollection'),
          variables: {
            username: 'testuser',
          },
        }),
        headers: {
          Authorization: 'Bearer test-token',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        responseType: 'json',
      })
    )

    expect(result.payload).toEqual(mockResponse.body)
    expect(result.authMode).toBe('env')
    expect(result.payload.user.contributionsCollection).toBeDefined()
    expect(result.payload.user.contributionsCollection.contributionCalendar).toBeDefined()
    expect(result.payload.user.contributionsCollection.contributionCalendar.totalContributions).toBe(1500)
    expect(result.payload.user.contributionsCollection.contributionCalendar.weeks).toHaveLength(1)
  })

  it('should include contributionsCollection in the GraphQL query', async () => {
    const mockResponse = {
      body: {
        user: {
          login: 'testuser',
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 0,
              weeks: []
            }
          }
        }
      }
    }

    vi.mocked(got.post).mockResolvedValue({ body: { data: mockResponse.body } } as never)

    await getGitHubWidgetContent('u1', documentStore)

    const queryCall = vi.mocked(got.post).mock.calls[0]
    const query = (queryCall[1] as { json: { query: string } }).json.query

    // Verify the query includes contributionsCollection
    expect(query).toContain('contributionsCollection')
    expect(query).toContain('contributionCalendar')
    expect(query).toContain('totalContributions')
    expect(query).toContain('weeks')
    expect(query).toContain('contributionDays')
    expect(query).toContain('date')
    expect(query).toContain('contributionCount')
    expect(query).toContain('color')
  })

  it('should throw error when GITHUB_ACCESS_TOKEN is missing', async () => {
    delete process.env.GITHUB_ACCESS_TOKEN

    await expect(getGitHubWidgetContent('u1', documentStore)).rejects.toThrow(/Missing GitHub credentials/)

    expect(got.post).not.toHaveBeenCalled()
  })

  it('should throw error when GITHUB_USERNAME is missing', async () => {
    delete process.env.GITHUB_USERNAME

    await expect(getGitHubWidgetContent('u1', documentStore)).rejects.toThrow(/Missing GitHub credentials/)

    expect(got.post).not.toHaveBeenCalled()
  })

  it('prefers connected GitHub OAuth credentials over env', async () => {
    vi.mocked(loadGitHubAuthForUser).mockResolvedValue({
      accessToken: 'oauth-token',
      githubUsername: 'oauth-user',
    })
    vi.mocked(got.post).mockResolvedValue({
      body: { data: { user: { login: 'oauth-user' } } },
    } as never)

    const result = await getGitHubWidgetContent('u1', documentStore)
    expect(result.authMode).toBe('oauth')

    expect(got.post).toHaveBeenCalledWith(
      'https://api.github.com/graphql',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer oauth-token',
        }),
        json: expect.objectContaining({
          variables: { username: 'oauth-user' },
        }),
      })
    )
  })

  it('loads OAuth integration using integrationLookupUserId when provided', async () => {
    vi.mocked(loadGitHubAuthForUser).mockResolvedValue({
      accessToken: 'oauth-token',
      githubUsername: 'oauth-user',
    })
    vi.mocked(got.post).mockResolvedValue({
      body: { data: { user: { login: 'oauth-user' } } },
    } as never)

    await getGitHubWidgetContent('hostname-slug', documentStore, 'firebase-uid-xyz')

    expect(loadGitHubAuthForUser).toHaveBeenCalledWith(documentStore, 'firebase-uid-xyz')
  })

  it('should handle API errors gracefully', async () => {
    const apiError = new Error('GitHub API error')
    vi.mocked(got.post).mockRejectedValue(apiError)

    await expect(getGitHubWidgetContent('u1', documentStore)).rejects.toThrow('GitHub API error')
  })

  it('should handle empty contribution data', async () => {
    const mockResponse = {
      body: {
        user: {
          login: 'testuser',
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 0,
              weeks: []
            }
          }
        }
      }
    }

    vi.mocked(got.post).mockResolvedValue({ body: { data: mockResponse.body } } as never)

    const result = await getGitHubWidgetContent('u1', documentStore)

    expect(result.payload.user.contributionsCollection.contributionCalendar.totalContributions).toBe(0)
    expect(result.payload.user.contributionsCollection.contributionCalendar.weeks).toEqual([])
  })

  it('should handle contribution data with multiple weeks', async () => {
    const mockResponse = {
      body: {
        user: {
          login: 'testuser',
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 100,
              weeks: [
                {
                  contributionDays: [
                    { date: '2024-01-01', contributionCount: 5, color: '#c6e48b' },
                    { date: '2024-01-02', contributionCount: 3, color: '#7bc96f' }
                  ]
                },
                {
                  contributionDays: [
                    { date: '2024-01-08', contributionCount: 8, color: '#239a3b' },
                    { date: '2024-01-09', contributionCount: 2, color: '#c6e48b' }
                  ]
                }
              ]
            }
          }
        }
      }
    }

    vi.mocked(got.post).mockResolvedValue({ body: { data: mockResponse.body } } as never)

    const result = await getGitHubWidgetContent('u1', documentStore)

    expect(result.payload.user.contributionsCollection.contributionCalendar.weeks).toHaveLength(2)
    expect(result.payload.user.contributionsCollection.contributionCalendar.weeks[0].contributionDays).toHaveLength(
      2
    )
    expect(result.payload.user.contributionsCollection.contributionCalendar.weeks[1].contributionDays).toHaveLength(
      2
    )
  })

  it('should use the GraphQL query that includes contributionsCollection', async () => {
    const mockResponse = {
      body: {
        user: {
          login: 'testuser',
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 0,
              weeks: []
            }
          }
        }
      }
    }

    vi.mocked(got.post).mockResolvedValue({ body: { data: mockResponse.body } } as never)

    await getGitHubWidgetContent('u1', documentStore)

    // Verify the query was used and contains the contributionsCollection field
    const queryCall = vi.mocked(got.post).mock.calls[0]
    const query = (queryCall[1] as { json: { query: string } }).json.query
    expect(query).toBeDefined()
    expect(query).toContain('contributionsCollection')
    expect(query).toContain('contributionCalendar')
  })

  it('throws when GitHub GraphQL returns errors', async () => {
    vi.mocked(got.post).mockResolvedValue({
      body: {
        errors: [{ message: 'Bad credentials' }, { message: 'Rate limited' }],
      },
    } as never)

    await expect(getGitHubWidgetContent('u1', documentStore)).rejects.toThrow('Bad credentials; Rate limited')
  })

  it('throws when GitHub GraphQL errors have empty messages (fallback text)', async () => {
    vi.mocked(got.post).mockResolvedValue({
      body: {
        errors: [{ message: '' }],
      },
    } as never)

    await expect(getGitHubWidgetContent('u1', documentStore)).rejects.toThrow('GitHub GraphQL error')
  })

  it('throws when GitHub GraphQL response has no data', async () => {
    vi.mocked(got.post).mockResolvedValue({
      body: {},
    } as never)

    await expect(getGitHubWidgetContent('u1', documentStore)).rejects.toThrow('GitHub GraphQL response missing data')
  })
})

