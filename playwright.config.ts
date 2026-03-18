import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false, // game tests are stateful, run sequentially
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Headless with WebGL support
    launchOptions: {
      args: ['--use-gl=egl', '--disable-web-security'],
    },
  },
  webServer: [
    {
      command: 'pnpm --filter @bojo-dojo/client exec vite --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 30_000,
      // Override .env so Vite connects to local PartyKit for tests
      env: { VITE_PARTYKIT_HOST: '127.0.0.1:21999' },
    },
    {
      command: 'pnpm --filter @bojo-dojo/server exec partykit dev --port 21999',
      port: 21999,
      reuseExistingServer: false,
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
