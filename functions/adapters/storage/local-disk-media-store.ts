import { createWriteStream, promises as fs } from 'fs'
import https from 'https'
import path from 'path'

import type { MediaDescriptor, MediaStore, StoredMedia } from '../../ports/media-store.js'

async function listFilesRecursive(rootDirectory: string, currentDirectory = ''): Promise<string[]> {
  const absoluteDirectory = currentDirectory
    ? path.join(rootDirectory, currentDirectory)
    : rootDirectory

  const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true })
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const relativePath = currentDirectory
      ? path.posix.join(currentDirectory, entry.name)
      : entry.name

    if (entry.isDirectory()) {
      return listFilesRecursive(rootDirectory, relativePath)
    }

    return [relativePath]
  }))

  return nestedFiles.flat()
}

export class LocalDiskMediaStore implements MediaStore {
  constructor(private readonly rootDirectory: string) {}

  async listFiles(): Promise<string[]> {
    try {
      return await listFilesRecursive(this.rootDirectory)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }

      throw error
    }
  }

  fetchAndStore({ destinationPath, mediaURL, id }: MediaDescriptor): Promise<StoredMedia> {
    return new Promise(async (resolve, reject) => {
      if (!mediaURL) {
        reject(new Error(`Missing media to download for ${id}.`))
        return
      }

      try {
        const absoluteDestinationPath = this.resolveAbsolutePath(destinationPath)

        await fs.mkdir(path.dirname(absoluteDestinationPath), { recursive: true })

        https.get(mediaURL, (res) => {
          const writeStream = createWriteStream(absoluteDestinationPath)

          res.pipe(writeStream)

          writeStream.on('finish', () => {
            writeStream.close(() => {
              resolve({
                id,
                fileName: destinationPath,
              })
            })
          })

          writeStream.on('error', (err) => {
            reject(new Error(`Failed to upload ${destinationPath}: ${err.message}`))
          })
        }).on('error', (err) => {
          reject(new Error(`Failed to download media for ${id}: ${err.message}`))
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  describe() {
    return {
      backend: 'disk',
      target: this.rootDirectory,
    }
  }

  resolveAbsolutePath(relativePath: string) {
    const normalizedPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
    return path.join(this.rootDirectory, normalizedPath)
  }
}
