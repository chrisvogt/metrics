import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/auth/establishApiSession.ts',
        'src/lib/baseUrl.ts',
        'src/lib/buildSha.ts',
        'src/lib/buildWidgetFetchHeaders.ts',
        'src/lib/deleteAccountConfirm.ts',
        'src/lib/onboardingCnameTarget.ts',
        'src/lib/overviewMetrics.ts',
        'src/lib/readDiscogsAuthModeFromSyncPayload.ts',
        'src/lib/readFlickrAuthModeFromSyncPayload.ts',
      ],
      all: true,
      thresholds: {
        perFile: true,
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 95,
      },
    },
  },
})
