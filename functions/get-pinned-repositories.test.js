import { describe, it, expect, vi, beforeEach } from 'vitest'
import getPinnedRepositories from './get-pinned-repositories.js'

// Mock graphql-got
vi.mock('graphql-got', () => ({
  default: vi.fn()
}))

// Mock lodash.get
vi.mock('lodash.get', () => ({
  default: vi.fn()
}))

import graphqlGot from 'graphql-got'
import get from 'lodash.get'

describe('getPinnedRepositories', () => {
  const mockConfig = {
    github: {
      access_token: 'test-token',
      username: 'testuser',
      pinned_repository_max: 5
    }
  }

  const mockResponse = {
    body: {
      user: {
        pinnedRepositories: {
          nodes: [
            {
              name: 'test-repo',
              description: 'Test repository',
              url: 'https://github.com/testuser/test-repo',
              primaryLanguage: {
                name: 'JavaScript',
                color: '#f1e05a'
              }
            }
          ]
        }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch pinned repositories successfully', async () => {
    graphqlGot.mockResolvedValue(mockResponse)
    get.mockReturnValue(mockResponse.body.user.pinnedRepositories.nodes)

    const result = await getPinnedRepositories({ config: mockConfig })

    expect(graphqlGot).toHaveBeenCalledWith('https://api.github.com/graphql', {
      query: expect.stringContaining('query PinnedRepositoriesQuery'),
      token: 'test-token',
      variables: {
        username: 'testuser',
        last: 5
      }
    })

    expect(get).toHaveBeenCalledWith(mockResponse.body, 'user.pinnedRepositories.nodes', [])
    expect(result).toEqual({
      pinnedRepositories: mockResponse.body.user.pinnedRepositories.nodes
    })
  })

  it('should use default max repositories when not specified', async () => {
    const configWithoutMax = {
      github: {
        access_token: 'test-token',
        username: 'testuser'
      }
    }

    graphqlGot.mockResolvedValue(mockResponse)
    get.mockReturnValue([])

    await getPinnedRepositories({ config: configWithoutMax })

    expect(graphqlGot).toHaveBeenCalledWith('https://api.github.com/graphql', {
      query: expect.stringContaining('query PinnedRepositoriesQuery'),
      token: 'test-token',
      variables: {
        username: 'testuser',
        last: 10 // Default value
      }
    })
  })

  it('should handle empty response gracefully', async () => {
    const emptyResponse = {
      body: {
        user: {
          pinnedRepositories: {
            nodes: []
          }
        }
      }
    }

    graphqlGot.mockResolvedValue(emptyResponse)
    get.mockReturnValue([])

    const result = await getPinnedRepositories({ config: mockConfig })

    expect(result).toEqual({
      pinnedRepositories: []
    })
  })

  it('should handle missing user data gracefully', async () => {
    const noUserResponse = {
      body: {}
    }

    graphqlGot.mockResolvedValue(noUserResponse)
    get.mockReturnValue([])

    const result = await getPinnedRepositories({ config: mockConfig })

    expect(result).toEqual({
      pinnedRepositories: []
    })
  })

  it('should handle API errors', async () => {
    const error = new Error('GitHub API error')
    graphqlGot.mockRejectedValue(error)

    await expect(getPinnedRepositories({ config: mockConfig })).rejects.toThrow('GitHub API error')
  })

  it('should handle malformed response', async () => {
    const malformedResponse = {
      body: null
    }

    graphqlGot.mockResolvedValue(malformedResponse)
    get.mockReturnValue([])

    const result = await getPinnedRepositories({ config: mockConfig })

    expect(result).toEqual({
      pinnedRepositories: []
    })
  })
})
