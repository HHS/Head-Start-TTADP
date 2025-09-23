import { test, expect } from '@playwright/test';

test('Regional Dashboard', async ({ page }) => {
  //navigate to the dashboard
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Regional Dashboard' }).click();
  await page.waitForURL(/region\.in/i);

  // get page URL
  const url = page.url();
  const params = new URL(url).searchParams;

  expect(params.get('region.in[]')).toBeTruthy();

  // open the filter menu, change the region filter to state code
  await page.getByRole('button', { name: /open filters for this page/i }).click();
  await page.getByLabel('topic', { exact: true }).selectOption('stateCode');
  await page.getByLabel('topic', { exact: true }).selectOption('stateCode');


  await page.getByLabel('condition', { exact: true }).selectOption('contains');
  await page.locator('.ttahub-filter-select__input-container').click();
  await page.getByText('Rhode Island (RI)', { exact: true }).click();
  await page.keyboard.press('Enter');

  await page.getByTestId('filters').click();
  await page.getByRole('button', { name: 'apply filters for regional dashboard' }).click();

  // remove the filter
  await page.getByRole('button', { name: 'This button removes the filter: State or territory contains RI' }).click();

  // switch the total training graph's display type back and forth
  await page.getByRole('button', { name: 'Open Actions for Total TTA hours' }).click();
  await page.getByRole('button', { name: 'Display table' }).click();
  await page.getByRole('button', { name: 'Open Actions for Total TTA hours' }).click();
  await page.getByRole('button', { name: 'Display graph' }).click();

  // toggle all the legend items off
  await page.locator('label').filter({ hasText: 'Training' }).click();
  await page.getByTestId('fieldset').getByText('Both').click();
  await page.getByTestId('fieldset').getByText('Technical Assistance').click();

  // print a screenshot of the TTA hours graph
  await page.getByRole('button', { name: 'Open Actions for Total TTA hours' }).click();

  await Promise.all([
    page.waitForEvent('download'),
    page.locator('#rd-save-screenshot').click()
  ]);

  // print a screenshot of the topics graph
  await Promise.all([
    page.waitForEvent('download'),
    page.locator('#rd-save-screenshot-topic-frequency').click()
  ]);

  // view the topics as a table
  await page.getByRole('button', { name: /display Number of Activity Reports by Topic as table/i }).click();

  // change the topics graph order
  await page.getByRole('button', { name: 'toggle Change topic graph order menu' }).click();
  await page.getByRole('button', { name: 'Select to view data from A to Z. Select Apply filters button to apply selection' }).click();
  await page.getByTestId('gridContainer').getByTestId('apply-filters-test-id').click();

  // make sure the activity reports table is visible
  await expect(page.getByRole('heading', { name: 'Activity reports' }).nth(2)).toBeVisible();
});