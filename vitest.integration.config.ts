import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load test env
config({ path: resolve(__dirname, 'tests/.env.test.local') })
config({ path: resolve(__dirname, 'tests/.env.test.example') })

export default defineConfig({
  test: {
    // Integration tests run serially — they hit a live Supabase instance
    pool:        'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    reporters:   ['verbose'],
    include: [
      'tests/security/**/*.test.ts',
      'tests/regression/**/*.test.ts',
    ],
    // Unit tests in apps/api/src remain in their own vitest config
    exclude: ['apps/**'],
  },
})
