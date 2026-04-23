import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    environment: 'happy-dom',
    restoreMocks: true
  }
})
