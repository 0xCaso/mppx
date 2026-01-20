import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    alias: {
      mpay: path.resolve(import.meta.dirname, 'src'),
    },
    globals: true,
    testTimeout: 60_000,
    retry: 3,
    globalSetup: ['./test/setup.global.ts'],
  },
})
