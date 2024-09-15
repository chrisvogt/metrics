const fs = require('fs')
const graphqlGot = require('graphql-got')
const path = require('path')
const { logger } = require('firebase-functions')

const query = fs.readFileSync(
  path.resolve(__dirname, '../queries/github-widget-content.gql'),
  'utf8'
)

const accessToken = process.env.GITHUB_ACCESS_TOKEN
const username = process.env.GITHUB_USERNAME

const getGitHubWidgetContent = async () => {
  logger.info('Fetching GitHub widget content...')
  
  logger.info('accessToken:', accessToken)
  logger.info('username:', username)

  if (!accessToken || !username) {
    throw new Error('Missing required config for GitHub widget.')
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
