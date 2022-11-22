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
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        headless: true,
        ignoreHTTPSErrors: true,
        acceptDownloads: true,
      },
    },
    // {
    //   name: 'Desktop Safari',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
    //     screenshot: 'only-on-failure',
    //     video: 'retain-on-failure',
    //     trace: 'retain-on-failure',
    //     headless: true,
    //     ignoreHTTPSErrors: true,
    //     acceptDownloads: true,
    //   },
    // },
    // {
    //   name: 'iPhone 13 Pro',
    //   use: {
    //     ...devices['iPhone 13 Pro'],
    //     baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000',
    //     screenshot: 'only-on-failure',
    //     video: 'retain-on-failure',
    //     trace: 'retain-on-failure',
    //     headless: true,
    //     ignoreHTTPSErrors: true,
    //     acceptDownloads: true,
    //   },
    // },
  ],
};
