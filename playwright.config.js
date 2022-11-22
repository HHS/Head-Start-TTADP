import { devices } from "@playwright/test";

export default {
  testDir: './tests',
  expect: {
    /** max time expect() should wait for conditions to be met. */
    timeout: 8000,
  },
  fullyParallel: true,
  /** reporter to use. see https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /** runs before all tests. */
  globalSetup: './tests/init/globalSetup.ts',

  projects: [
    {
      name: 'Desktop',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
      // use: {
      //   browserName: 'chromium',
      //   baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
      //   viewport: { width: 1280, height: 720 },
      //   ignoreHTTPSErrors: true,
      //   headless: true,
      //   acceptDownloads: true,
      //   screenshot: 'only-on-failure',
      //   video: 'retain-on-failure',
      //   trace: 'retain-on-failure',
      // },
    },
    {
      name: 'Mobile',
      use: {
        ...devices['iPhone 13 Pro'],
        baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
      // use: {
      //   browserName: 'chromium',
      //   baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
      //   viewport: { width: 375, height: 812 },
      //   ignoreHTTPSErrors: true,
      //   headless: true,
      //   acceptDownloads: true,
      //   screenshot: 'only-on-failure',
      //   video: 'retain-on-failure',
      //   trace: 'retain-on-failure',
      // },
    },
  ],
};
