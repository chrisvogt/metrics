import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
          proxy.on('error', (_err, req, res) => {
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
