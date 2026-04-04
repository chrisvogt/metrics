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

// Mock graphql-got
vi.mock('graphql-got', () => ({
  default: vi.fn()
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
import graphqlGot from 'graphql-got'
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

    graphqlGot.mockResolvedValue(mockResponse)

    const result = await getGitHubWidgetContent('u1', documentStore)

    expect(graphqlGot).toHaveBeenCalledWith('https://api.github.com/graphql', {
      query: expect.stringContaining('contributionsCollection'),
      headers: {
        Authorization: 'Bearer test-token',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      variables: {
        username: 'testuser'
      }
    })

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

    graphqlGot.mockResolvedValue(mockResponse)

    await getGitHubWidgetContent('u1', documentStore)

    const queryCall = graphqlGot.mock.calls[0]
    const query = queryCall[1].query

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

    expect(graphqlGot).not.toHaveBeenCalled()
  })

  it('should throw error when GITHUB_USERNAME is missing', async () => {
    delete process.env.GITHUB_USERNAME

    await expect(getGitHubWidgetContent('u1', documentStore)).rejects.toThrow(/Missing GitHub credentials/)

    expect(graphqlGot).not.toHaveBeenCalled()
  })

  it('prefers connected GitHub OAuth credentials over env', async () => {
    vi.mocked(loadGitHubAuthForUser).mockResolvedValue({
      accessToken: 'oauth-token',
      githubUsername: 'oauth-user',
    })
    graphqlGot.mockResolvedValue({ body: { user: { login: 'oauth-user' } } })

    const result = await getGitHubWidgetContent('u1', documentStore)
    expect(result.authMode).toBe('oauth')

    expect(graphqlGot).toHaveBeenCalledWith(
      'https://api.github.com/graphql',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer oauth-token',
        }),
        variables: { username: 'oauth-user' },
      })
    )
  })

  it('loads OAuth integration using integrationLookupUserId when provided', async () => {
    vi.mocked(loadGitHubAuthForUser).mockResolvedValue({
      accessToken: 'oauth-token',
      githubUsername: 'oauth-user',
    })
    graphqlGot.mockResolvedValue({ body: { user: { login: 'oauth-user' } } })

    await getGitHubWidgetContent('hostname-slug', documentStore, 'firebase-uid-xyz')

    expect(loadGitHubAuthForUser).toHaveBeenCalledWith(documentStore, 'firebase-uid-xyz')
  })

  it('should handle API errors gracefully', async () => {
    const apiError = new Error('GitHub API error')
    graphqlGot.mockRejectedValue(apiError)

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

    graphqlGot.mockResolvedValue(mockResponse)

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

    graphqlGot.mockResolvedValue(mockResponse)

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

    graphqlGot.mockResolvedValue(mockResponse)

    await getGitHubWidgetContent('u1', documentStore)

    // Verify the query was used and contains the contributionsCollection field
    const queryCall = graphqlGot.mock.calls[0]
    const query = queryCall[1].query
    expect(query).toBeDefined()
    expect(query).toContain('contributionsCollection')
    expect(query).toContain('contributionCalendar')
  })
})

