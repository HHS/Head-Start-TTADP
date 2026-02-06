import { test, expect, Page } from '@playwright/test';
import { SCOPE_IDS } from '@ttahub/common';
import { query } from '../utils/common';
import { getEnvNumber } from '../../src/envParser';

let originalActivityReportPermissions: Array<{ userId: number; regionId: number; scopeId: number }> = [];

const getCurrentUserId = () => getEnvNumber('CURRENT_USER_ID', 1, { warnOnDefault: true });

test.beforeAll(async ({ request }) => {
  const userId = getCurrentUserId();
  const readScopes = [SCOPE_IDS.READ_ACTIVITY_REPORTS, SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS];
  const selectResponse = await query(
    request,
    `SELECT "userId", "regionId", "scopeId"
     FROM "Permissions"
     WHERE "userId" = ${userId}
       AND "scopeId" IN (${readScopes.join(', ')});`,
  );
  const [rows] = await selectResponse.json();
  originalActivityReportPermissions = rows || [];

  await query(
    request,
    `DELETE FROM "Permissions"
     WHERE "userId" = ${userId}
       AND "scopeId" IN (${readScopes.join(', ')});`,
  );

  await query(
    request,
    `INSERT INTO "Permissions" ("userId", "regionId", "scopeId")
     VALUES (${userId}, 1, ${SCOPE_IDS.READ_ACTIVITY_REPORTS});`,
  );
});

test.afterAll(async ({ request }) => {
  const userId = getCurrentUserId();
  const readScopes = [SCOPE_IDS.READ_ACTIVITY_REPORTS, SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS];

  await query(
    request,
    `DELETE FROM "Permissions"
     WHERE "userId" = ${userId}
       AND "scopeId" IN (${readScopes.join(', ')});`,
  );

  if (originalActivityReportPermissions.length > 0) {
    const values = originalActivityReportPermissions
      .map((p) => `(${p.userId}, ${p.regionId}, ${p.scopeId})`)
      .join(', ');
    await query(
      request,
      `INSERT INTO "Permissions" ("userId", "regionId", "scopeId")
       VALUES ${values};`,
    );
  }
});

const openFilters = async (page: Page, condition: string, value: string) => {
  await page.getByRole('button', { name: /open filters for this page/i }).click();
  const conditionDropdown = page.locator('select[name="condition"]');
  await conditionDropdown.selectOption(condition);
  await conditionDropdown.locator('..').locator('select').last().selectOption(value);
  await page.getByTestId('apply-filters-test-id').click();
};

test.describe('activity reports landing page', () => {
  test('properly displays start date in filter', async ({ page }) => {
    await page.goto('http://localhost:3000/activity-reports?region.in[]=1&startDate.in[]=2023%2F04%2F04-2023%2F05%2F04');
    await page.waitForTimeout(5000);
    expect(page.getByText('04/04/2023-05/04/2023')).toBeTruthy();
  });

  test('properly displays end date in filter', async ({ page }) => {
    await page.goto('http://localhost:3000/activity-reports?region.in[]=1&endDate.in[]=2023%2F04%2F04-2023%2F05%2F04');
    await page.waitForTimeout(5000);
    expect(page.getByText('04/04/2023-05/04/2023')).toBeTruthy();
  });

  test('only allows access to correct regions despite shared url', async ({ page }) => {
    // this user only has access to region 1 (set in beforeAll)
    await page.goto('http://localhost:3000/activity-reports?region.in[]=1&region.in[]=2&region.in[]=3&region.in[]=4&region.in[]=5&region.in[]=6&region.in[]=7&region.in[]=8&region.in[]=9&region.in[]=10&region.in[]=11&region.in[]=12');

    // this button confirms the modal is open and the regions have been checked
    // vs the user's permissions
    // no action is possible except making a selection on the modal
    await page.getByRole('button', { name: 'Show filter with my regions' }).click();

    // assert correct url
    await expect(page).toHaveURL(/\/activity-reports\?region\.in\[\]=1$/);
  });

  test('ttaType filter works correctly', async ({ page }) => {
  // go to ar page
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Activity Reports' }).click();

    // filter by is training
    await page.getByRole('button', { name: /open filters for this page/i }).click();
    await page.getByRole('button', { name: /add new filter/i }).click();
    await page.locator('select[name="topic"]').selectOption('ttaType');
    await page.locator('select[name="condition"]').selectOption('is');
    await page.getByTestId('apply-filters-test-id').click();

    await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).not.toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).not.toBeVisible();

    // filter by is not training
    await openFilters(page, 'is not', 'training');
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).not.toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).toBeVisible();

    // filter by is technical assistance
    await openFilters(page, 'is', 'technical-assistance');
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).not.toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).not.toBeVisible();

    // filter by is not technical assistance
    await openFilters(page, 'is not', 'technical-assistance');
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).not.toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).toBeVisible();

    // filter by is both
    await openFilters(page, 'is', 'training,technical-assistance');
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).not.toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).not.toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).toBeVisible();

    // filter by is not both
    await openFilters(page, 'is not', 'training,technical-assistance');
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9998' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9997' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'R01-AR-9999' })).not.toBeVisible();
  });
});
