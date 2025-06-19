const fs = require('fs')
const graphqlGot = require('graphql-got')
const path = require('path')

const query = fs.readFileSync(
  path.resolve(__dirname, '../queries/github-widget-content.gql'),
  'utf8'
)

const getGitHubWidgetContent = async () => {
  const accessToken = process.env.GITHUB_ACCESS_TOKEN
  const username = process.env.GITHUB_USERNAME

  if (!accessToken || !username) {
    throw new Error('Missing required environment variables for GitHub widget (GITHUB_ACCESS_TOKEN or GITHUB_USERNAME).')
  }

  const { body } = await graphqlGot('https://api.github.com/graphql', {
    query,
    headers: {
      Authorization: `token ${accessToken}`
    },
    variables: {
      username,
    },
  })

  return body
}

module.exports = getGitHubWidgetContent
