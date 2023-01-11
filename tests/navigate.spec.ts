import { test, expect } from '@playwright/test';

test('can navigate around', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await page.getByRole('link', { name: 'Activity Reports' }).click();
  expect(await page.getByRole('heading', { name: /activity reports - region \d/i })).toBeTruthy();

  await page.getByRole('link', { name: 'Regional Dashboard' }).click();
  expect(await page.getByRole('heading', { name: /region \d tta activity dashboard/i })).toBeTruthy();

  await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
  expect(await page.getByRole('heading', { name: 'Recipient Records' })).toBeTruthy();

  await page.getByTestId('header-avatar').click();
  await page.getByRole('link', { name: 'Account Management' }).click();
  expect(await page.getByRole('heading', { name: /account management/i })).toBeTruthy();
});