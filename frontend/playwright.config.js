import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  testIgnore: '**/pages.spec.js',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4179', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4179 --strictPort', url: 'http://127.0.0.1:4179', reuseExistingServer: !process.env.CI },
})
