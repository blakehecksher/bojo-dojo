import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false, // game tests are stateful, run sequentially
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // Headless with WebGL support
    launchOptions: {
      args: ['--use-gl=egl', '--disable-web-security'],
    },
  },
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
      // Override .env so Vite connects to local PartyKit for tests
      env: { VITE_PARTYKIT_HOST: 'localhost:1999' },
    },
    {
      command: 'pnpm dev:server',
      port: 1999,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
