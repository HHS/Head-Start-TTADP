import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const axeUrls = [
  'http://localhost:3000/',
  'http://localhost:3000/activity-reports/new/activity-summary',
  'http://localhost:3000/activity-reports/new/activity-summary',
  'http://localhost:3000/activity-reports/new/supporting-attachments',
  'http://localhost:3000/activity-reports/new/goals-objectives',
  'http://localhost:3000/activity-reports/new/next-steps',
  'http://localhost:3000/activity-reports/new/review',
  'http://localhost:3000/admin',
  'http://localhost:3000/activity-reports/view/9999',
  'http://localhost:3000/regional-dashboard',
  'http://localhost:3000/recipient-tta-records',
  'http://localhost:3000/recipient-tta-records/9/region/1/profile',
  'http://localhost:3000/recipient-tta-records/9/region/1/tta-history',
  'http://localhost:3000/recipient-tta-records/9/region/1/goals-objectives',
  'http://localhost:3000/recipient-tta-records/9/region/1/goals/new',
  'http://localhost:3000/recipient-tta-records/9/region/1/goals-objectives/print',
];

const testForAxeViolations = async (page: Page, url: string) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500); // mirror the "sleep" in the original circle ci config
  const builder = new AxeBuilder({ page });
  builder.disableRules(['aria-allowed-attr', 'empty-table-header']);  
  const results = await builder.analyze();
  expect(results.violations).toEqual([]);
};  

test('run axe tests in playwright', async ({ page }) => {
  for (const url of axeUrls) {
    await testForAxeViolations(page, url);
  }
});
