import fs from 'fs'
import graphqlGot from 'graphql-got'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

export default getGitHubWidgetContent
