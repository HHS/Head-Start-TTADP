import { test, expect } from '@playwright/test';
import moment from 'moment';

const lastThirtyDays = `${moment().subtract(30, 'days').format('MM/DD/YYYY')}-${moment().format('MM/DD/YYYY')}`;

test('Regional Dashboard', async ({ page }) => {
  //navigate to the dashboard
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Regional Dashboard' }).click();

  // remove one of the filters
  await page.getByRole('button', { name: `This button removes the filter: Date started is within ${lastThirtyDays}` }).click();

  // open the filter menu, change the region filter to state code
  await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
  await page.getByLabel('Select a filter').selectOption('stateCode');
  await page.getByLabel('Select a condition').selectOption('contains');
  await page.getByLabel('Select a condition').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Rhode Island');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'apply filters for regional dashboard' }).click();

  // remove the remaining filter
  await page.getByRole('button', { name: 'This button removes the filter: State contains RI' }).click();

  // switch the total training graph's display type back and forth
  await page.getByRole('button', { name: 'display total training and technical assistance hours as table' }).click();
  await page.getByRole('button', { name: 'display total training and technical assistance hours as graph' }).click();

  // toggle all the legend items off
  await page.locator('label').filter({ hasText: 'Training' }).click();
  await page.getByText('Both').click();
  await page.getByText('Technical Assistance').click();

  // print a screenshot
  await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('gridContainer').getByTestId('button').click()
  ]);

  // view the topics as a table
  await page.getByRole('button', { name: 'display number of activity reports by topic data as table' }).click();

  // change the topics graph order
  await page.getByRole('button', { name: 'toggle Change topic graph order menu' }).click();
  await page.getByRole('button', { name: 'Select to view data from A to Z. Select Apply filters button to apply selection' }).click();
  await page.getByTestId('gridContainer').getByTestId('apply-filters-test-id').click();

  // make sure the activity reports table is visible
  await expect(page.getByRole('heading', { name: 'Activity reports' }).nth(2)).toBeVisible();
});