import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const axeUrls = [
  { url: 'http://localhost:3000/', rules: [] },
  { url: 'http://localhost:3000/activity-reports/new/activity-summary', rules: [] },
  { url: 'http://localhost:3000/activity-reports/new/supporting-attachments', rules: [] },
  { url: 'http://localhost:3000/activity-reports/new/goals-objectives', rules: [] },
  { url: 'http://localhost:3000/activity-reports/new/next-steps', rules: [] },
  { url: 'http://localhost:3000/activity-reports/new/review', rules: [] },
  { url: 'http://localhost:3000/activity-reports/view/9999', rules: [] },
  { url: 'http://localhost:3000/dashboards/regional-dashboard/activity-reports', rules: [] },
  { url: 'http://localhost:3000/training-reports/not-started', rules: [] },
  { url: 'http://localhost:3000/recipient-tta-records', rules: [] },
  { url: 'http://localhost:3000/recipient-tta-records/9/region/1/profile', rules: [] },
  { url: 'http://localhost:3000/recipient-tta-records/9/region/1/tta-history', rules: [] },
  { url: 'http://localhost:3000/recipient-tta-records/9/region/1/rttapa', rules: [] },
  { url: 'http://localhost:3000/recipient-tta-records/9/region/1/goals/new', rules: [] },
  { url: 'http://localhost:3000/recipient-tta-records/9/region/1/rttapa/print', rules: [] },
];

const testForAxeViolations = async (page: Page, url: { url: string, rules: string[] }) => {
  await page.goto(url.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500); // mirror the "sleep" in the original circle ci config
  const builder = new AxeBuilder({ page });
  // builder.disableRules([...url.rules, 'aria-allowed-attr', 'empty-table-header']);  
  builder.disableRules(url.rules);
  const results = await builder.analyze();
  expect(results.violations).toEqual([]);
};  

for (const url of axeUrls) {
  test(`testing with ${url.url}`, async ({ page }) => {
    await testForAxeViolations(page, url);
  });
}
