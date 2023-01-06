import { test, expect } from '@playwright/test';

test('rtr goals and objectives has the correct title', async ({ page }) => {
  await page.goto('http://localhost:3000/recipient-tta-records/11/region/1/goals-objectives');
  expect(await page.title()).toBe('Goals and Objectives - Agency 2 in region 1, Inc. - TTA Hub');
});
