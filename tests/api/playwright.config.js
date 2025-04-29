/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: '.',
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: './html-report', open: 'never' }],
    ['junit', { outputFile: './report.xml' }]
  ],
  workers: 1,
};

export default config;
