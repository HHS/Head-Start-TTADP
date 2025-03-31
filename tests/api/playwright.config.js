/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: '.',
  outputDir: './test-results',
  reporter: [
    ['html', { outputFolder: './html-report', open: 'never' }],
    ['list'], ['junit', { outputFile: 'report.xml' }]
  ],
  workers: 1,
};

export default config;
