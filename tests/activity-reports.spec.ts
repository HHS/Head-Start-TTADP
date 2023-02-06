import { test, expect, Page } from '@playwright/test';

// const openFilters = async (page: Page, condition: string, value: string) => {
//   await page.getByRole('button', { name: /open filters for this page/i }).click();
//   const conditionDropdown = page.locator('select[name="condition"]');
//   await conditionDropdown.selectOption(condition);
//   await conditionDropdown.locator('..').locator('select').last().selectOption(value);
//   await page.getByTestId('apply-filters-test-id').click();
// };

test.describe('activity reports landing page', () => {
  test('only allows access to correct regions despite shared url', async ({ page }) => {
    // this user only has access to region 1
    await page.goto('http://localhost:3000/activity-reports?region.in[]=1&region.in[]=2&region.in[]=3&region.in[]=4&region.in[]=5&region.in[]=6&region.in[]=7&region.in[]=8&region.in[]=9&region.in[]=10&region.in[]=11&region.in[]=12');

    // this button confirms the modal is open and the regions have been checked
    // vs the user's permissions
    // no action is possible except making a selection on the modal
    await page.getByRole('button', { name: 'Show filter with my regions' }).click();

    // assert correct url
    expect(page.url()).toBe('http://localhost:3000/activity-reports?region.in[]=1');
  });

  // test('ttaType filter works correctly', async ({ page }) => {
  // // go to ar page
  //   await page.goto('http://localhost:3000/');
  //   await page.getByRole('link', { name: 'Activity Reports' }).click();

  //   // filter by is training
  //   await page.getByRole('button', { name: /open filters for this page/i }).click();
  //   await page.getByRole('button', { name: /add new filter/i }).click();
  //   await page.locator('select[name="topic"]').selectOption('ttaType');
  //   await page.locator('select[name="condition"]').selectOption('is');
  //   await page.getByTestId('apply-filters-test-id').click();

  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).not.toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).not.toBeVisible();

  //   // filter by is not training
  //   await openFilters(page, 'is not', 'training');
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).not.toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).toBeVisible();

  //   // filter by is technical assistance
  //   await openFilters(page, 'is', 'technical-assistance');
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).not.toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).not.toBeVisible();

  //   // filter by is not technical assistance
  //   await openFilters(page, 'is not', 'technical-assistance');
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).not.toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).toBeVisible();

  //   // filter by is both
  //   await openFilters(page, 'is', 'training,technical-assistance');
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).not.toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).not.toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).toBeVisible();

  //   // filter by is not both
  //   await openFilters(page, 'is not', 'training,technical-assistance');
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).toBeVisible();
  //   await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).not.toBeVisible();
  // });
});
