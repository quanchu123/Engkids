import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Vitest config for unit-testing the pure game systems under src/.
// Kept separate from the existing Playwright (e2e) setup so the two runners
// never pick up each other's files.
export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" -> "./src/*" path alias so tests can import
    // shared modules (e.g. "@/lib/word-bank") the same way app code does.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Explicit imports are preferred over globals (no global describe/it/expect).
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      '.next/**',
      'tests/**',
      'tests/e2e/**',
      '**/*.spec.ts',
      'playwright.config.ts',
      // Written for Node's built-in test runner (node:test), not Vitest —
      // belongs to the spaced-repetition-review spec and is run separately.
      'src/lib/srs.test.ts',
    ],
  },
})
