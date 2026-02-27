import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'out', 'dist'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@bun': resolve(__dirname, 'src/bun'),
    },
  },
})
