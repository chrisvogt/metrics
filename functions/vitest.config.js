import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__/',
        'coverage/',
        '*.config.js'
      ]
    },
    include: ['**/*.test.js', '**/*.spec.js'],
    exclude: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**'
    ],
    reporters: [
      'default',
      ['junit', { outputFile: 'coverage/junit.xml' }]
    ]
  }
}) 