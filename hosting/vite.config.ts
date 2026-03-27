import { execSync } from 'node:child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 7-char SHA from CI env, or `git` at build time—reflects the UI bundle, not Functions. */
function getGitShortSha(): string {
  const raw =
    process.env.VITE_GIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.COMMIT_SHA
  if (raw) {
    const s = raw.replace(/^v/, '').trim()
    return s.length >= 7 ? s.slice(0, 7) : s
  }
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: __dirname }).trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  define: {
    __GIT_SHORT_SHA__: JSON.stringify(getGitShortSha()),
  },
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        rewrite: (path) => '/personal-stats-chrisvogt/us-central1/app' + path,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            const r = res as NodeJS.WritableStream & { writeHead?: (code: number, headers: Record<string, string>) => void; end?: (body: string) => void }
            if (r.writeHead && r.end) {
              r.writeHead(503, { 'Content-Type': 'application/json' })
              r.end(
                JSON.stringify({
                  ok: false,
                  error:
                    'Backend not running. Start the emulators in another terminal: firebase emulators:start --only functions,auth — or run pnpm run dev:full',
                })
              )
            }
          })
        },
      },
    },
  },
})
