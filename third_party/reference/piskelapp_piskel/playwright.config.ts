import { defineConfig } from '@playwright/test';

const baseUrl = 'http://localhost:9001';

export default defineConfig({
  testDir: 'tests/e2e/playwright',
  outputDir: 'tests/e2e/playwright/tmp',
  snapshotPathTemplate: '{testDir}/{testFileDir}/snapshots/{arg}{ext}',
  retries: 3,

  // Run a local server before starting the tests
  webServer: {
    command: 'npm run start:test',
    url: baseUrl,
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  use: {
    baseURL: baseUrl
  },
});