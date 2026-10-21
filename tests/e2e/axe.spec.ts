import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TODO: label-content-name-mismatch became enforced in axe-core 4.14. Re-enable once the
// flagged buttons' aria-labels include their visible text (WCAG 2.5.3).
const axeUrls = [
  { url: 'http://localhost:3000/', disabledRules: [] },
  {
    url: 'http://localhost:3000/activity-reports/new/activity-summary',
    disabledRules: ['aria-allowed-attr'],
  },
  { url: 'http://localhost:3000/activity-reports/new/supporting-attachments', disabledRules: [] },
  { url: 'http://localhost:3000/activity-reports/new/goals-objectives', disabledRules: [] },
  { url: 'http://localhost:3000/activity-reports/new/next-steps', disabledRules: [] },
  {
    url: 'http://localhost:3000/activity-reports/new/review',
    disabledRules: ['aria-allowed-attr'],
  },
  { url: 'http://localhost:3000/activity-reports/view/9999', disabledRules: [] },
  {
    url: 'http://localhost:3000/dashboards/regional-dashboard/activity-reports',
    disabledRules: ['empty-table-header', 'label-content-name-mismatch'],
  },
  { url: 'http://localhost:3000/training-reports/not-started', disabledRules: [] },
  { url: 'http://localhost:3000/recipient-tta-records', disabledRules: [] },
  { url: 'http://localhost:3000/recipient-tta-records/9/region/1/profile', disabledRules: [] },
  {
    url: 'http://localhost:3000/recipient-tta-records/9/region/1/tta-history',
    disabledRules: ['empty-table-header', 'label-content-name-mismatch'],
  },
  {
    url: 'http://localhost:3000/recipient-tta-records/9/region/1/rttapa',
    disabledRules: ['label-content-name-mismatch'],
  },
  { url: 'http://localhost:3000/recipient-tta-records/9/region/1/goals/new', disabledRules: [] },
  { url: 'http://localhost:3000/recipient-tta-records/9/region/1/rttapa/print', disabledRules: [] },
];

const testForAxeViolations = async (page: Page, url: { url: string; disabledRules: string[] }) => {
  await page.goto(url.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500); // mirror the "sleep" in the original circle ci config
  const builder = new AxeBuilder({ page });
  builder.disableRules(url.disabledRules);
  const results = await builder.analyze();
  expect(results.violations).toEqual([]);
};

for (const url of axeUrls) {
  test(`testing with ${url.url}`, async ({ page }) => {
    await testForAxeViolations(page, url);
  });
}
