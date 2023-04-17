/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests/api',
  outputDir: './playwright/api/test-results',
  reporter: [['html', { outputFolder: './playwright/api/report', open: 'never' }]],
};

export default config;
