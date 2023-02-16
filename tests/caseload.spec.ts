import { test, expect } from '@playwright/test';
import { blur } from './common';

test('caseload management', async ({ page }) => {
  // navigate to the app
  await page.goto('http://localhost:3000/');

  // go to the account admin area
  await page.getByTestId('header-avatar').click();
  await page.getByRole('link', { name: 'Account Management' }).click();

  // create a  new group
  await page.getByRole('link', { name: 'Create group' }).click();
  await page.getByTestId('textInput').fill('A new group for me');

  await page.locator('[class$="-ValueContainer"]').click();
  await page.keyboard.press('Enter');

  await blur(page);
  await page.getByRole('button', { name: 'Save group' }).click();

  // navigate to the recipient search page
  await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
  await page.getByRole('button', { name: 'open filters for this page' }).click();
  await page.locator('select[name="topic"]').selectOption('group');
  await page.locator('select[name="condition"]').selectOption('is');
  await page.locator('[class$="-ValueContainer"]').click();
  await page.keyboard.press('Enter');
  const responsePromise = page.waitForResponse(/api\/recipient\/search/);
  await page.getByTestId('apply-filters-test-id').click();
  await responsePromise;

  expect(page.getByRole('cell', { name: 'Agency 1.a in region 1, Inc.' })).toBeTruthy(); 
  expect(await page.locator('tbody > tr').count()).toBe(1);

  // edit group
  await page.getByTestId('header-avatar').click();
  await page.getByRole('link', { name: 'Account Management' }).click();
  await page.getByRole('link', { name: 'Edit group' }).click();
  await page.getByTestId('textInput').clear()
  await page.getByTestId('textInput').fill('A new group for me and you');  
  await page.getByRole('button', { name: 'Save group' }).click();

  // delete group
  await page.getByText('A new group for me and youEdit groupDelete group').click();
  await page.getByRole('button', { name: 'Delete group' }).click();
  expect(page.getByText('You have no groups.')).toBeTruthy();
});