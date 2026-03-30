import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      exclude: [
        'node_modules/',
        '__tests__/',
        'coverage/',
        '*.config.js',
        'scripts/**/*.cjs',
        'lib/**',
        'api/cloud-storage/list-stored-media.ts'
      ],
      thresholds: {
        lines: 100,
        statements: 99.8,
        functions: 100,
        branches: 96.5
      }
    },
    include: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
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