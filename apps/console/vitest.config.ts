import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    testTimeout: 15_000,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/app/(main)/auth/page.tsx',
        'src/app/(main)/layout.tsx',
        'src/app/(main)/page.tsx',
        'src/app/about/page.tsx',
        'src/app/docs/page.tsx',
        'src/app/u/[username]/page.tsx',
        'src/auth/establishApiSession.ts',
        'src/components/user-settings/SettingsProfileIdentity.tsx',
        'src/layout/Layout.tsx',
        'src/lib/baseUrl.ts',
        'src/lib/buildSha.ts',
        'src/lib/buildWidgetFetchHeaders.ts',
        'src/lib/authless-tenant-surface.ts',
        'src/lib/deleteAccountConfirm.ts',
        'src/lib/functions-app-origin.ts',
        'src/lib/onboardingCnameTarget.ts',
        'src/lib/overviewMetrics.ts',
        'src/lib/readDiscogsAuthModeFromSyncPayload.ts',
        'src/lib/readFlickrAuthModeFromSyncPayload.ts',
        'src/lib/server-widget-fetch-origin.ts',
        'src/lib/tenant-api-root-map.ts',
        'src/lib/useFirestoreTenantRootSlug.ts',
        'src/lib/widget-status.ts',
        'src/app/internal/tenant-resolve/route.ts',
        'src/proxy.ts',
      ],
      all: true,
      // JSX-heavy components (e.g. settings identity) have many presentational branches;
      // keep lines/statements strict and allow slightly lower branch/function coverage.
      thresholds: {
        perFile: true,
        lines: 95,
        statements: 95,
        functions: 92,
        branches: 85,
      },
    },
  },
})
