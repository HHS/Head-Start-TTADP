// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
import { devices } from '@playwright/test';

// see https://playwright.dev/docs/api/class-testconfig

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: '.',
  outputDir: './test-results',
  workers: 1, // setting to a higher number may result in test failures, ymmv
  expect: {
    timeout: 20000,
  },
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { outputFolder: './html-report', open: 'never' }],
    ['junit', { outputFile: './report.xml' }]
  ],
  timeout: 300000,
  globalTimeout: 900000,
  globalSetup: './init/globalSetup.ts',
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
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
};

export default config;
