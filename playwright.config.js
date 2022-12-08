/* eslint-disable import/no-extraneous-dependencies */
import { devices } from '@playwright/test';

// see https://playwright.dev/docs/api/class-testconfig
export default {
  testDir: './tests',
  workers: 2, // changing because of possible data collisions
  expect: {
    /** max time expect() should wait for conditions to be met. */
    timeout: 8000,
  },
  fullyParallel: true,
  /** reporter to use. see https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  timeout: 60000,
  globalTimeout: 600000,
  /** runs before all tests. */
  globalSetup: './tests/init/globalSetup.ts',
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        // see https://playwright.dev/docs/api/class-testoptions
        ...devices['Desktop Chrome'],
        baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        headless: true,
        ignoreHTTPSErrors: true,
        acceptDownloads: true,
      },
    },
  ],
};
