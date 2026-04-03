import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/lib/baseUrl.ts',
        'src/lib/buildSha.ts',
        'src/lib/overviewMetrics.ts',
        'src/lib/readFlickrAuthModeFromSyncPayload.ts',
      ],
      all: true,
      thresholds: {
        perFile: true,
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
})
