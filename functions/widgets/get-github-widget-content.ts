import fs from 'fs'
import graphqlGot from 'graphql-got'
import path from 'path'
import { fileURLToPath } from 'url'

import type { DocumentStore } from '../ports/document-store.js'
import { getGitHubConfig } from '../config/backend-config.js'
import { loadGitHubAuthForUser } from '../services/github-integration-credentials.js'
import type { GitHubWidgetContent } from '../types/widget-content.js'

export type GitHubWidgetAuthMode = 'oauth' | 'env'

export interface GitHubWidgetFetchResult {
  payload: GitHubWidgetContent
  authMode: GitHubWidgetAuthMode
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const query = fs.readFileSync(
  path.resolve(__dirname, './queries/github-widget-content.gql'),
  'utf8'
)

const getGitHubWidgetContent = async (
  userId: string,
  documentStore: DocumentStore,
  /** When set (e.g. signed-in operator), load OAuth token from `users/{this}/integrations/github` instead of `userId`. */
  integrationLookupUserId?: string
): Promise<GitHubWidgetFetchResult> => {
  const integrationUid = integrationLookupUserId ?? userId
  const oauth = await loadGitHubAuthForUser(documentStore, integrationUid)
  const envCfg = getGitHubConfig()
  const accessToken = oauth?.accessToken ?? envCfg.accessToken
  const username = oauth?.githubUsername ?? envCfg.username
  const authMode: GitHubWidgetAuthMode = oauth?.accessToken ? 'oauth' : 'env'
  if (!accessToken || !username) {
    throw new Error(
      'Missing GitHub credentials: connect GitHub in onboarding or set GITHUB_ACCESS_TOKEN and GITHUB_USERNAME.'
    )
  }

  const { body } = await graphqlGot('https://api.github.com/graphql', {
    query,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    variables: {
      username,
    },
  })

  return { payload: body as GitHubWidgetContent, authMode }
}

export default getGitHubWidgetContent
