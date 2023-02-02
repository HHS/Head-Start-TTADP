// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
import { devices } from '@playwright/test';

// see https://playwright.dev/docs/api/class-testconfig

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests',
  outputDir: './playwright/test-results',
  workers: 2, // changing because of possible data collisions
  expect: {
    timeout: 20000,
  },
  fullyParallel: true,
  reporter: [['html', { outputFolder: './playwright/report', open: 'never' }]],
  timeout: 500000,
  globalTimeout: 900000,
  globalSetup: './tests/init/globalSetup.ts',
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        // see https://playwright.dev/docs/api/class-testoptions
        ...devices['Desktop Chrome'],
        baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
        screenshot: 'on',
        video: 'on',
        trace: 'on',
        headless: true,
        ignoreHTTPSErrors: true,
        acceptDownloads: true,
      },
    },
  ],
};

export default config;
