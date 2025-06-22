import get from 'lodash.get'
import graphqlGot from 'graphql-got'

const query = `
query PinnedRepositoriesQuery($username: String!, $last: Int = 10) {
	user(login: $username) {
		pinnedRepositories(last: $last){
			totalCount
			nodes {
				createdAt
				description
				descriptionHTML
				diskUsage
				hasIssuesEnabled
				hasWikiEnabled
				homepageUrl
				licenseInfo {
					name
					nickname
					key
					url
				}
				name
				nameWithOwner
				openGraphImageUrl
				primaryLanguage {
					color
					name
				}
				updatedAt
				pushedAt
				url
				usesCustomOpenGraphImage
			}
		}
	}
}`

const MAX_REPOS = 10
const getPinnedRepositories = async ({ config }) => {
  const {
    github: {
      access_token: token,
      pinned_repository_max: last = MAX_REPOS,
      username
    }
  } = config

  const { body } = await graphqlGot('https://api.github.com/graphql', {
    query,
    token,
    variables: {
      username,
      last
    }
  })

  const pinnedRepositories = get(body, 'user.pinnedRepositories.nodes', [])
  return {
    pinnedRepositories
  }
}

export default getPinnedRepositories
