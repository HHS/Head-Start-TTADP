/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: '.',
  outputDir: './test-results',
  reporter: [['html', { outputFolder: './report', open: 'never' }]],
};

export default config;
