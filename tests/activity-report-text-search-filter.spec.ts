import { test, expect, Page } from '@playwright/test';

/**
 * This should be called before clicking the apply filters button, it returns three
 * "waitForRequest" promises that should be awaited before continuing.
 *
 * @param page
 * @returns Array of three promises that can be awaited
 */
const waitForLandingFilterRequests = (page: Page): Promise<any>[] => {
  const overview = /\/api\/widgets\/overview/;
  const arReqRegex = /\/api\/activity-reports\?/;
  const alerts = /\/api\/activity-reports\/alerts/;

  return [
    page.waitForResponse(arReqRegex),
    page.waitForResponse(overview),
    page.waitForResponse(alerts),
  ];
};

test.describe('Activity Report Text Search Filter', () => {
  test('can search for text on indexed fields', async ({ page }) => {
    /** *
     * Note that to avoid spinning up a queue and worker, this test passing relies on seeded report
     * data from the sequelize approved report seeders, and the elastic search index being
     * bootstrapped with the same data via the yarn script "bootstrap-es". If you are having trouble
     * running it locally and don't want to be bothered with this test, you can uncomment the
     * following statement to skip it.
     */

    // if (!process.env.CI) {
    //   return;
    // }

    // Navigate to app.
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Activity Reports' }).click();

    // Report text filter search.
    await page.getByRole('button', { name: 'open filters for this page' }).click();

    await page.getByRole('button', { name: 'add new filter' }).click(); 

    await page.waitForTimeout(2000);

    // Add report text filter.
    await page.locator('select[name="topic"]').selectOption('reportText');

    // Contains context.
    await page.locator('select[name="condition"]').selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('the ocean is tasty');
    let prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).toBeVisible();

    // Doesn't contain context.
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('the ocean is tasty');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).not.toBeVisible();

    // Contains goal.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('cook');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9998' })).toBeVisible();

    // Doesn't contain goal.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('cook');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9998' })).not.toBeVisible();

    // Contains objective.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('first meal');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).toBeVisible();

    // Doesn't contain objective.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('first meal');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).not.toBeVisible();

    // Contains objective tta.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('prep instruction');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).toBeVisible();

    // Doesn't contain objective tta.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('prep instruction');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).not.toBeVisible();

    // Contains Specialist step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('you can dream it');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9998' })).toBeVisible();

    // Doesn't contain Specialist step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('you can dream it');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9998' })).not.toBeVisible();

    // Contains Recipient step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('one small positive thought');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).toBeVisible();

    // Doesn't contain Recipient step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('one small positive thought');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).not.toBeVisible();

    // Mix with Report ID.
    await page.getByRole('button', { name: 'open filters for this page' }).click();
    await page.getByRole('button', { name: 'remove Report text does not contain one small positive thought filter. click apply filters to make your changes' }).click();
    await page.getByRole('button', { name: 'Add new filter' }).click();
    await page.locator('select[name="topic"]').selectOption('reportText');
    await page.locator('select[name="condition"]').selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('ocean');

    await page.getByRole('button', { name: 'Add new filter' }).click();
    await page.getByRole('combobox', { name: 'topic' }).nth(1).selectOption('reportId');
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('contains');
    await page.getByLabel('Enter a report id').click();
    await page.getByLabel('Enter a report id').fill('9999');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).toBeVisible();

    await page.getByRole('button', { name: 'open filters for this page' }).click();
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('does not contain');
    await page.getByLabel('Enter a report id').click();
    await page.getByLabel('Enter a report id').fill('9999');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).not.toBeVisible();

    // Mix with Reasons.
    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'topic' }).nth(1).selectOption('reason');
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is');
    await page.getByText('Select reasons to filter by').click();
    await page.keyboard.press('Enter');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).toBeVisible();

    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is not');
    await page.getByText('Select reasons to filter by').click();
    await page.keyboard.press('Enter');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).not.toBeVisible();
  });
});
