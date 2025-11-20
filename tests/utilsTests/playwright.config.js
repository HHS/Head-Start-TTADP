import { devices } from '@playwright/test';

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: '.',
  outputDir: './test-results',
  reporter: [
    ['html', { outputFolder: './report', open: 'never' }],
    ['junit', { outputFile: './report.xml' }]
],
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        // see https://playwright.dev/docs/api/class-testoptions
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9999/',
      },
    },
  ],
};

export default config;
