const graphqlGot = require("graphql-got");

const query = `
query getGitHubWidgetContent($username: String!) {
	user(login: $username) {
    login
    name
		status {
		  id
      createdAt
      message
		}
    projectsUrl
    location
    avatarUrl
    pinnedRepositories(last: 10){
			totalCount
			nodes {
				createdAt
				description
				descriptionHTML
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
    pullRequests(last: 1, states: MERGED) {
      nodes {
        labels(last: 10) {
          edges {
            node {
              id
              color
              name
            }
          }
        }
        lastEditedAt
        authorAssociation
        url
        closed
        closedAt
        createdAt
        merged
        number
        repository {
          name
          id
          url
        }
        title
        url
        viewerDidAuthor
      }
    }
	}
}`;

const getGitHubWidgetContent = async ({ context }) => {
    const {
        config: {
          github: { access_token: token, username }
        }
      } = context;
    
      const { body } = await graphqlGot("https://api.github.com/graphql", {
        query,
        token,
        variables: {
          username
        }
      });

      return body;
};

module.exports = getGitHubWidgetContent;
