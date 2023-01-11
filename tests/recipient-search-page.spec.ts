import { test, expect } from '@playwright/test';

test('recipient search page', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  //navigate to recipient search page
  await page.getByRole('link', { name: 'Recipient TTA Records' }).click();

  // search for recipient
  await page.getByLabel('Search recipient records by name or grant id').fill('agency 1');

  // submit form
  await page.getByRole('button', { name: 'Search for matching recipients' }).click();

  // click on first result
  await page.getByRole('link', { name: 'Agency 1.a in region 1, Inc.' }).click();

  await Promise.all([
      expect(page.getByRole('heading', { name: 'Agency 1.a in region 1, Inc. - Region 1' })).toBeVisible(),
      expect(page.getByRole('heading', { name: 'Recipient summary' })).toBeVisible(),
      expect(page.getByRole('heading', { name: 'Grants' })).toBeVisible(),
  ]);
});