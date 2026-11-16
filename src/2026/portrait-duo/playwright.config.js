import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:4317',
    viewport: { width: 1440, height: 1100 },
    permissions: ['camera', 'microphone', 'clipboard-read', 'clipboard-write'],
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4317',
    env: { PORT: '4317' },
    reuseExistingServer: false,
  },
});
