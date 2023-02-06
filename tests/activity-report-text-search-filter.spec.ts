import { test, expect } from '@playwright/test';

test.describe('Activity Report Text Search Filter', () => {
  test('can search for text on indexed fields', async ({ page }) => {
    // only run on CI for now
    if (!process.env.CI) {
      return;
    }

    // Navigate to app.
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Activity Reports' }).click();

    // Report text filter search.
    await page.getByRole('button', { name: 'open filters for this page' }).click();

    // Add report text filter.
    await page.locator('select[name="topic"]').selectOption('reportText');

    // Contains context.
    await page.locator('select[name="condition"]').selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('the ocean is tasty');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).toBeVisible();

    // Doesn't contain context.
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('the ocean is tasty');
    await page.getByTestId('apply-filters-test-id').click();
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
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9998' })).not.toBeVisible();

    // Contains objective.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('first meal');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).toBeVisible();

    // Doesn't contain objective.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('first meal');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).not.toBeVisible();

    // Contains objective tta.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('prep instruction');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).toBeVisible();

    // Doesn't contain objective tta.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('prep instruction');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).not.toBeVisible();

    // Contains Specialist step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('you can dream it');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9998' })).toBeVisible();

    // Doesn't contain Specialist step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('you can dream it');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9998' })).not.toBeVisible();

    // Contains Recipient step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('one small positive thought');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).toBeVisible();

    // Doesn't contain Recipient step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('one small positive thought');
    await page.getByTestId('apply-filters-test-id').click();
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
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).toBeVisible();

    await page.getByRole('button', { name: 'open filters for this page' }).click();
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('does not contain');
    await page.getByLabel('Enter a report id').click();
    await page.getByLabel('Enter a report id').fill('9999');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).not.toBeVisible();

    // Mix with Reasons.
    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'topic' }).nth(1).selectOption('reason');
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is');
    await page.getByText('Select reasons to filter by').click();
    await page.keyboard.press('Enter');
    await page.getByTestId('apply-filters-test-id').click();
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).toBeVisible();

    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is not');
    await page.getByText('Select reasons to filter by').click();
    await page.keyboard.press('Enter');
    await page.getByTestId('apply-filters-test-id').click();
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9997' })).not.toBeVisible();

    // Mix with Start Date
    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is on or before');
    await page.getByTestId('date-picker-external-input').click();
    await page.getByTestId('date-picker-external-input').fill('01/15/2023');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: 'R01-AR-9999' })).not.toBeVisible();
  });
});
