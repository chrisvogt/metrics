import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      exclude: [
        'node_modules/**',
        'coverage/**',
        '**/*.test.js',
        '**/*.spec.js',
        '.eslintrc.js',
      ],
      all: true,
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
  },
}) 