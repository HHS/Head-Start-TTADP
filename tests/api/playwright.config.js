/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: '.',
  outputDir: './playwright/api/test-results',
  reporter: [['html', { outputFolder: './playwright/api/report', open: 'never' }]],
};

export default config;
