import { test, expect } from '@playwright/test';
import { blur } from './common';

test('my groups', async ({ page }) => {
  // navigate to the app
  await page.goto('http://localhost:3000/');

  // go to the account admin area
  await page.getByTestId('header-avatar').click();
  await page.getByRole('link', { name: 'Account Management' }).click();

  // create a  new group
  const groupGrantsLoaded = page.waitForResponse(/api\/groups\/new\/grants/);
  const groupEligibleUsersLoaded = page.waitForResponse(/api\/groups\/new\/eligibleUsers/);
  await page.getByRole('link', { name: 'Create a group' }).click();
  await groupGrantsLoaded;
  await groupEligibleUsersLoaded;
  await page.getByTestId('textInput').fill('A new group for me');

  await page.getByTestId('select-recipients-new-group-click-container').click();
  await page.keyboard.press('Enter');

  await blur(page);

  // Check 'Keep this group private.' checkbox for now.
  await page.getByText('Keep this group private.').click();
  await blur(page);

  await page.getByRole('button', { name: 'Save group' }).click();

  // navigate to the recipient search page
  const recipientPageLoad = page.waitForResponse(/api\/recipient\/search/)
  await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
  await recipientPageLoad;
  await page.getByRole('button', { name: 'open filters for this page' }).click();
  await page.locator('select[name="topic"]').selectOption('group');
  await page.locator('select[name="condition"]').selectOption('is');
  await page.getByLabel('Select group to filter by').click();
  await page.keyboard.press('Enter');
  const responsePromise = page.waitForResponse(/api\/recipient\/search/);
  await page.getByTestId('apply-filters-test-id').click();
  await responsePromise;

  expect(page.getByRole('cell', { name: 'Agency 1.a in region 1, Inc.' })).toBeTruthy(); 
  expect(await page.locator('tbody > tr').count()).toBe(1);

  // edit group
  await page.getByTestId('header-avatar').click();
  await page.getByRole('link', { name: 'Account Management' }).click();
  await page.getByRole('link', { name: /Edit A new group for me/i }).click();
  await page.getByTestId('textInput').clear()
  await page.getByTestId('textInput').fill('A new group for me and you');  
  await page.getByRole('button', { name: 'Save group' }).click();
});
