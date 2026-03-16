import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'

import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(import.meta.dirname)
const guardedDirectories = [
  'app',
  'jobs',
  'services/sync',
  'widgets',
]
const forbiddenImportPatterns = [
  /from 'firebase-admin/,
  /from "firebase-admin/,
  /from 'firebase-functions/,
  /from "firebase-functions/,
  /from 'firebase\//,
  /from "firebase\//,
]

describe('provider import boundary', () => {
  it('keeps Firebase and GCP SDK imports out of guarded service code', async () => {
    const collectFiles = (directoryPath: string): string[] =>
      readdirSync(directoryPath).flatMap((entry) => {
        const entryPath = path.join(directoryPath, entry)
        const stats = statSync(entryPath)

        if (stats.isDirectory()) {
          return collectFiles(entryPath)
        }

        if (entryPath.endsWith('.test.ts') || !entryPath.endsWith('.ts')) {
          return []
        }

        return [entryPath]
      })

    const files = guardedDirectories.flatMap((directory) =>
      collectFiles(path.join(rootDir, directory))
    )

    const violations = files.filter((filePath) => {
      const source = readFileSync(filePath, 'utf8')
      return forbiddenImportPatterns.some((pattern) => pattern.test(source))
    })

    expect(violations).toEqual([])
  })
})
