import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true, // bind 0.0.0.0 so /etc/hosts aliases resolve to this process
    strictPort: true, // fail fast if 5174 is in use rather than silently picking another
    allowedHosts: ['dev-chronogrove.com', 'localhost'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('three')) return 'three'
          if (id.includes('react-dom') || id.includes('react/')) return 'react'
        },
      },
    },
  },
})
