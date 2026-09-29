import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/pages.spec.js',
  use: { baseURL: 'http://127.0.0.1:4180/Paarfuss-Inventur/', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4180 --strictPort --base=/Paarfuss-Inventur/',
    url: 'http://127.0.0.1:4180/Paarfuss-Inventur/',
    reuseExistingServer: false,
  },
})
