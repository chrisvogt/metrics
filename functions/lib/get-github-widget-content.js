const fs = require('fs')
const functions = require('firebase-functions')
const graphqlGot = require('graphql-got')
const path = require('path')

const query = fs.readFileSync(
  path.resolve(__dirname, '../queries/github-widget-content.gql'),
  'utf8'
)

const getGitHubWidgetContent = async () => {
  const config = functions.config()

  const { github: { access_token: accessToken, username } = {} } = config

  if (!accessToken || !username) {
    throw new Error('Missing required config for GitHub widget.')
  }

  const { body } = await graphqlGot('https://api.github.com/graphql', {
    query,
    headers: {
      Authorization: `token ${accessToken}`,
    },
    variables: {
      username,
    },
  })

  return body
}

module.exports = getGitHubWidgetContent
