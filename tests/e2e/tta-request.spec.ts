import { expect, type Locator, type Page, test } from '@playwright/test';
import { query } from '../utils/common';

// Seeded users (see src/seeders/20201124160449-users.js): the creator writes TTA requests in
// region 1, and the reviewer reviews them there. Neither has these TTA request permissions in
// the seed data, so the spec grants them and takes back only what it granted.
const CREATOR = { id: 5, name: 'Cucumber User', fullName: 'Cucumber User, GS' };
const REVIEWER = { id: 10, name: 'adam', fullName: 'adam, GS', withRole: 'adam (GS)' };
const REGION_ID = 1;
const READ_WRITE_TTA_REQUESTS = 10;
const REVIEW_TTA_REQUESTS = 11;
const FEATURE_FLAG = 'recipient_tta_request';

const RECIPIENT = 'Agency 2 in region 1, Inc.';
const GRANT = '09HP01111';

const NOTE_DATE = /\w+ \d{1,2}, \d{4} • \d{1,2}:\d{2} UTC/;

type Grant = { userId: number; scopeId: number };
const PERMISSIONS: Grant[] = [
  { userId: CREATOR.id, scopeId: READ_WRITE_TTA_REQUESTS },
  { userId: REVIEWER.id, scopeId: REVIEW_TTA_REQUESTS },
];

// what this spec added, so cleanup leaves anything that was already there
const granted: Grant[] = [];
let addedFlag = false;
let ttaRequestId: number | null = null;

const rowsOf = async (response: Awaited<ReturnType<typeof query>>) => {
  const [rows] = await response.json();
  return rows as Record<string, unknown>[];
};

const actAs = (page: Page, userId: number) =>
  page.setExtraHTTPHeaders({ 'playwright-user-id': String(userId) });

/** picks the option that matches `option` in the react-select with this input id */
async function chooseOption(page: Page, inputId: string, option: string | RegExp) {
  await page.locator(`#${inputId}`).click();
  await page.getByRole('option', { name: option }).first().click();
}

/** the entries in the Notes summary, oldest first */
const noteEntries = (page: Page): Locator =>
  page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Notes summary' }) })
    .getByRole('listitem');

async function expectNote(
  entry: Locator,
  { phase, author, role, note }: { phase: string; author: string; role: string; note: string }
) {
  await expect(entry.getByText(phase, { exact: true })).toBeVisible();
  await expect(entry.getByText(author, { exact: true })).toBeVisible();
  await expect(entry.getByText(role, { exact: true })).toBeVisible();
  await expect(entry.getByText(note, { exact: true })).toBeVisible();
  await expect(entry).toContainText(NOTE_DATE);
}

/** the request's row in the Active TTA requests table */
const requestRow = (page: Page, displayId: string) =>
  page.getByRole('row').filter({ has: page.getByRole('link', { name: displayId, exact: true }) });

test.describe('TTA request review', () => {
  test.beforeAll(async ({ request }) => {
    for (const { userId, scopeId } of PERMISSIONS) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await rowsOf(
        await query(
          request,
          `SELECT 1 FROM "Permissions"
           WHERE "userId" = ${userId} AND "regionId" = ${REGION_ID} AND "scopeId" = ${scopeId};`
        )
      );
      if (!existing.length) {
        // eslint-disable-next-line no-await-in-loop
        await query(
          request,
          `INSERT INTO "Permissions" ("userId", "regionId", "scopeId", "createdAt", "updatedAt")
           VALUES (${userId}, ${REGION_ID}, ${scopeId}, NOW(), NOW());`
        );
        granted.push({ userId, scopeId });
      }
    }

    // the reviewer is an admin, so only the creator needs the feature flag
    const flagged = await rowsOf(
      await query(
        request,
        `SELECT 1 FROM "Users" WHERE id = ${CREATOR.id} AND '${FEATURE_FLAG}' = ANY(flags);`
      )
    );
    if (!flagged.length) {
      await query(
        request,
        `UPDATE "Users" SET flags = array_append(flags, '${FEATURE_FLAG}') WHERE id = ${CREATOR.id};`
      );
      addedFlag = true;
    }
  });

  test.afterAll(async ({ request }) => {
    // its grants, citations, approvers and notes cascade with it
    if (ttaRequestId) {
      await query(request, `DELETE FROM "TtaRequests" WHERE id = ${ttaRequestId};`);
    }
    for (const { userId, scopeId } of granted) {
      // eslint-disable-next-line no-await-in-loop
      await query(
        request,
        `DELETE FROM "Permissions"
         WHERE "userId" = ${userId} AND "regionId" = ${REGION_ID} AND "scopeId" = ${scopeId};`
      );
    }
    if (addedFlag) {
      await query(
        request,
        `UPDATE "Users" SET flags = array_remove(flags, '${FEATURE_FLAG}') WHERE id = ${CREATOR.id};`
      );
    }
  });

  test.setTimeout(120000);

  test('the creator resubmits a request the reviewer sent back for changes', async ({ page }) => {
    let displayId = '';

    await test.step('the creator submits the request for review', async () => {
      await actAs(page, CREATOR.id);
      await page.goto('/tta-requests');
      await page.getByRole('link', { name: 'Add request' }).click();
      await expect(page.getByRole('heading', { name: 'TTA Request summary' })).toBeVisible();

      await chooseOption(page, 'recipient', RECIPIENT);
      // USWDS hides the inputs behind their labels, so click the label; a grant's is its full
      // name, which includes its number
      await page.locator('label', { hasText: GRANT }).click();
      await expect(page.getByRole('checkbox', { name: new RegExp(GRANT) })).toBeChecked();
      await page.locator('label[for="recipient-aware-yes"]').click();
      await chooseOption(page, 'originator', 'Recipient');
      await chooseOption(page, 'goal', /\(FEI\)/);

      await page
        .getByRole('textbox', { name: 'Provide background or context for this request' })
        .click();
      await page.keyboard.type('The recipient asked for help with enrollment.');

      await page.getByLabel('Add creator notes').fill('Initial request notes');
      await chooseOption(page, 'reviewer', REVIEWER.name);

      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      const alert = page.getByRole('alert').filter({ hasText: 'You submitted request' });
      await expect(alert).toBeVisible();
      displayId = (await alert.getByRole('link').textContent()) ?? '';
      expect(displayId).toMatch(/^R01-REQ-\d+$/);
      ttaRequestId = Number(displayId.split('-').pop());

      await expect(requestRow(page, displayId)).toContainText('Submitted');
    });

    await test.step('the reviewer sends it back for changes', async () => {
      await actAs(page, REVIEWER.id);
      await page.goto(`/tta-requests/view/${ttaRequestId}`);
      await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible();

      await expect(noteEntries(page)).toHaveCount(1);
      await expectNote(noteEntries(page).nth(0), {
        phase: 'Draft TTA Request',
        author: CREATOR.fullName,
        role: 'Creator',
        note: 'Initial request notes',
      });

      await page.getByLabel('Choose review status').selectOption('needs_action');
      await page.getByLabel('Add TTAC or Manager notes').fill('Please add the agenda');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText(
        `You sent request ${displayId} back to its creator for changes on`
      );
      await expect(requestRow(page, displayId)).toContainText('Needs action');
    });

    await test.step('the creator sees who asked for changes and why', async () => {
      await actAs(page, CREATOR.id);
      await page.goto('/tta-requests');
      await requestRow(page, displayId).getByRole('link', { name: 'Needs action' }).click();

      // the creator edits the request in its form, rather than seeing it read only
      await expect(page).toHaveURL(new RegExp(`/tta-requests/${ttaRequestId}$`));
      await expect(
        page.getByText(`${REVIEWER.withRole} is asking for changes to this TTA request.`)
      ).toBeVisible();
      await expect(page.getByText('Needs action', { exact: true }).locator('..')).toContainText(
        `Needs action from ${REVIEWER.fullName}`
      );

      await expect(noteEntries(page)).toHaveCount(2);
      await expectNote(noteEntries(page).nth(0), {
        phase: 'Draft TTA Request',
        author: CREATOR.fullName,
        role: 'Creator',
        note: 'Initial request notes',
      });
      await expectNote(noteEntries(page).nth(1), {
        phase: 'TTA Request review - needs action',
        author: REVIEWER.fullName,
        role: 'Reviewer',
        note: 'Please add the agenda',
      });

      // the last notes are in the history, so the field starts blank for the next ones
      await expect(page.getByLabel('Add creator notes')).toHaveValue('');
      await expect(page.getByRole('button', { name: 'Update request' })).toBeVisible();
    });

    await test.step('the creator makes the changes and resubmits', async () => {
      await page
        .getByRole('textbox', { name: 'Provide background or context for this request' })
        .click();
      await page.keyboard.press('End');
      await page.keyboard.type(' The agenda is attached.');
      await page.getByLabel('Add creator notes').fill('Agenda added');
      await page.getByRole('button', { name: 'Update request' }).click();

      await expect(
        page.getByRole('alert').filter({ hasText: `You submitted request ${displayId}` })
      ).toBeVisible();
      await expect(requestRow(page, displayId)).toContainText('Submitted');
    });

    await test.step('the reviewer sees every note in the order it was left', async () => {
      await actAs(page, REVIEWER.id);
      await page.goto(`/tta-requests/view/${ttaRequestId}`);

      await expect(noteEntries(page)).toHaveCount(3);
      await expectNote(noteEntries(page).nth(0), {
        phase: 'Draft TTA Request',
        author: CREATOR.fullName,
        role: 'Creator',
        note: 'Initial request notes',
      });
      await expectNote(noteEntries(page).nth(1), {
        phase: 'TTA Request review - needs action',
        author: REVIEWER.fullName,
        role: 'Reviewer',
        note: 'Please add the agenda',
      });
      await expectNote(noteEntries(page).nth(2), {
        phase: 'Draft TTA Request',
        author: CREATOR.fullName,
        role: 'Creator',
        note: 'Agenda added',
      });

      // the request is back with the reviewer, so they can review it again
      await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible();
      await expect(page.getByText('The agenda is attached.', { exact: false })).toBeVisible();
    });
  });
});
