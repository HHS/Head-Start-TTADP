/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: '.',
  outputDir: './test-results',
  reporter: [
    ['html', { outputFolder: './test-results/report', outputFile: 'api-report.html', open: 'never' }],
  ],
  workers: 1,
};

export default config;
