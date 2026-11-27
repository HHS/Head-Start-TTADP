import { expect, type Locator, type Page, test } from '@playwright/test';
import { query } from '../utils/common';

// Seeded users (see src/seeders/20201124160449-users.js): the creator writes TTA requests in
// region 1, the reviewer reviews them there, and a backup COR approves them there; the COR is
// an admin, so needs no feature flag. None has
// these TTA request permissions in the seed data, so the spec grants them and takes back only
// what it granted. The reviewer is a GS whose home region is 1, so they can assign themselves.
const CREATOR = { id: 5, name: 'Cucumber User', fullName: 'Cucumber User, GS' };
const REVIEWER = { id: 10, name: 'adam', fullName: 'adam, GS', withRole: 'adam (GS)' };
// the COR's roles vary between environments, so their name with roles is matched loosely
const BACKUP_COR = { id: 1, name: 'Hermione Granger', fullName: /^Hermione Granger(, .+)?$/ };
const REGION_ID = 1;
const READ_WRITE_TTA_REQUESTS = 10;
const REVIEW_TTA_REQUESTS = 11;
const BACKUP_APPROVE_TTA_REQUESTS = 13;
const FEATURE_FLAG = 'recipient_tta_request';

const RECIPIENT = 'Agency 2 in region 1, Inc.';
const GRANT = '09HP01111';
// the recipient's other grant, which the reviewer switches the request to
const OTHER_GRANT = '09HP01112';

/** the background the reviewer rewrites the request's context to */
const REVIEWER_CONTEXT = 'Enrollment help, with the agenda attached. Reviewer clarified scope.';

const NOTE_DATE = /\w+ \d{1,2}, \d{4} • \d{1,2}:\d{2} UTC/;

const RTTAPA_ALERT = "This goal will be added to the recipient's RTTAPA.";
const NO_MONITORING_REPORT_ALERT = "The TTA Hub doesn't have this recipient's monitoring report";

type Grant = { userId: number; scopeId: number };
const PERMISSIONS: Grant[] = [
  { userId: CREATOR.id, scopeId: READ_WRITE_TTA_REQUESTS },
  { userId: REVIEWER.id, scopeId: REVIEW_TTA_REQUESTS },
  { userId: BACKUP_COR.id, scopeId: BACKUP_APPROVE_TTA_REQUESTS },
];

// what this spec added, so cleanup leaves anything that was already there
const granted: Grant[] = [];
let addedFlag = false;
let ttaRequestId: number | null = null;
// the goals the request's grants already had, so cleanup removes only the ones its approval created
let existingGoalIds: number[] = [];

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

/** assigns the staff member to the request on the reviewer's form */
async function assignStaff(page: Page, name: string) {
  await page.getByLabel('Assign staff').click();
  await page.getByRole('option', { name }).first().click();
}

/** the entries in the Notes summary, oldest first */
const noteEntries = (page: Page): Locator =>
  page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Notes summary' }) })
    .getByRole('listitem');

async function expectNote(
  entry: Locator,
  {
    phase,
    author,
    role,
    note,
  }: { phase: string; author: string | RegExp; role: string; note: string }
) {
  await expect(entry.getByText(phase, { exact: true })).toBeVisible();
  await expect(entry.getByText(author, { exact: true }).first()).toBeVisible();
  await expect(entry.getByText(role, { exact: true })).toBeVisible();
  await expect(entry.getByText(note, { exact: true })).toBeVisible();
  await expect(entry).toContainText(NOTE_DATE);
}

/** the value under a label in a read-only section of the request */
const readOnlyValue = (page: Page, label: string): Locator =>
  page.locator(`div:text-is("${label}") + div`);

/** the TTA requests table with this title, Active or Approved */
const requestsTable = (page: Page, title: string) =>
  page
    .locator('.ttahub-tta-requests-table')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });

/** the request's row in the TTA requests table with this title */
const requestRow = (page: Page, displayId: string, table = 'Active TTA requests') =>
  requestsTable(page, table)
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: displayId, exact: true }) });

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

    existingGoalIds = (
      await rowsOf(
        await query(
          request,
          `SELECT g.id FROM "Goals" g
           JOIN "Grants" gr ON gr.id = g."grantId"
           WHERE gr.number IN ('${GRANT}', '${OTHER_GRANT}');`
        )
      )
    ).map(({ id }) => Number(id));
  });

  test.afterAll(async ({ request }) => {
    let createdGoalIds: number[] = [];
    if (ttaRequestId) {
      createdGoalIds = (
        await rowsOf(
          await query(
            request,
            `SELECT "goalId" AS id FROM "TtaRequestGoals" WHERE "ttaRequestId" = ${ttaRequestId};`
          )
        )
      )
        .map(({ id }) => Number(id))
        .filter((id) => !existingGoalIds.includes(id));
      // its grants, citations, approvers, notes, assigned staff and goal links cascade with it
      await query(request, `DELETE FROM "TtaRequests" WHERE id = ${ttaRequestId};`);
    }
    if (createdGoalIds.length) {
      const ids = createdGoalIds.join(', ');
      await query(request, `DELETE FROM "GoalStatusChanges" WHERE "goalId" IN (${ids});`);
      await query(request, `DELETE FROM "GoalCollaborators" WHERE "goalId" IN (${ids});`);
      await query(request, `DELETE FROM "Goals" WHERE id IN (${ids});`);
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

  test('a request goes through review and COR approval, creating its goal on the RTR', async ({
    page,
    request,
  }) => {
    let displayId = '';
    // the goal the reviewer switches the request to
    let reviewerGoal = '';

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

      // the grant has no monitoring report, so the monitoring goal has no citations to choose
      await chooseOption(page, 'goal', /\(Monitoring\)/);
      await expect(page.getByText(NO_MONITORING_REPORT_ALERT)).toBeVisible();
      await expect(page.getByText('Citations being addressed')).toHaveCount(0);

      await chooseOption(page, 'goal', /\(FEI\)/);
      await expect(page.getByText(RTTAPA_ALERT)).toBeVisible();
      await expect(page.getByText(NO_MONITORING_REPORT_ALERT)).toHaveCount(0);

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

      await expect(requestRow(page, displayId)).toContainText('TTAC/Manager review pending');
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

      await expect(page.getByRole('heading', { name: 'TTA assignment' })).toBeVisible();
      await assignStaff(page, REVIEWER.fullName);
      await page.getByLabel('Choose review status').selectOption('needs_action');
      await page.getByLabel('Add TTAC or Manager notes').fill('Please add the agenda');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText(
        `You sent request ${displayId} back to its creator for changes on`
      );
      await expect(requestRow(page, displayId)).toContainText('Pending changes');
      // the reviewer is an admin, and an admin can also edit a request sent back for changes
      await expect(
        requestRow(page, displayId).getByRole('link', { name: 'Pending changes' })
      ).toBeVisible();
    });

    await test.step('the creator sees who asked for changes and why', async () => {
      await actAs(page, CREATOR.id);
      await page.goto('/tta-requests');
      // the request is waiting on the creator now, so it reads as theirs to act on
      await requestRow(page, displayId).getByRole('link', { name: 'Needs action' }).click();

      // the creator edits the request in its form, rather than seeing it read only
      await expect(page).toHaveURL(new RegExp(`/tta-requests/${ttaRequestId}$`));
      await expect(
        page.getByText(`${REVIEWER.withRole} is asking for changes to this TTA request.`)
      ).toBeVisible();
      // the banner says who asked for changes, so there is no review status list as well
      await expect(page.getByText('Review status', { exact: true })).toHaveCount(0);

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
      await expect(requestRow(page, displayId)).toContainText('TTAC/Manager review pending');
    });

    await test.step('the reviewer sees every note in the order it was left', async () => {
      await actAs(page, REVIEWER.id);
      // the resubmitted request is waiting on the reviewer again
      await page.goto('/tta-requests');
      // its status links the reviewer to where they review it
      await requestRow(page, displayId).getByRole('link', { name: 'Needs action' }).click();
      await expect(page).toHaveURL(new RegExp(`/tta-requests/view/${ttaRequestId}$`));

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

    await test.step('the reviewer edits the request in place and sends it to the COR', async () => {
      // nothing to share or print while the review is under way
      await expect(page.getByRole('button', { name: 'Print to PDF' })).toHaveCount(0);

      // the staff assigned on the first review are still assigned
      await expect(page.getByText(REVIEWER.fullName, { exact: true }).first()).toBeVisible();

      // the review is started before the details are edited, and survives the edit
      await page.getByLabel('Choose review status').selectOption('approved');
      await chooseOption(page, 'approver', `${BACKUP_COR.name} (backup)`);
      await page.getByLabel('Add TTAC or Manager notes').fill('Over to you');

      await page.getByRole('button', { name: 'Edit request' }).click();
      // still the review, not the request form
      await expect(page).toHaveURL(new RegExp(`/tta-requests/view/${ttaRequestId}(#.*)?$`));

      // who it is for, who reviews it and the creator's notes stay the creator's
      await expect(page.getByLabel('Recipient', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Add creator notes')).toHaveCount(0);

      // the rest is the creator's as submitted, for the reviewer to change, the grant among the
      // recipient's included
      await expect(page.getByRole('checkbox', { name: new RegExp(GRANT) })).toBeChecked();
      await page.locator('label', { hasText: OTHER_GRANT }).click();
      await page.locator('label', { hasText: GRANT }).click();
      await expect(page.getByRole('checkbox', { name: new RegExp(OTHER_GRANT) })).toBeChecked();
      await expect(page.getByRole('checkbox', { name: new RegExp(GRANT) })).not.toBeChecked();

      await expect(page.locator('#recipient-aware-yes')).toBeChecked();
      await page.locator('label[for="recipient-aware-no"]').click();
      await chooseOption(page, 'originator', 'Regional Office');

      await page.locator('#goal').click();
      const goalOption = page
        .getByRole('option')
        .filter({ hasNotText: /\((FEI|Monitoring)\)/ })
        .first();
      reviewerGoal = ((await goalOption.textContent()) ?? '').trim();
      expect(reviewerGoal).not.toBe('');
      await goalOption.click();

      // the editor puts the cursor where it is clicked, so the context is replaced outright
      await page
        .getByRole('textbox', { name: 'Provide background or context for this request' })
        .click();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type(REVIEWER_CONTEXT);

      // the review filled in before the edit is as it was left
      await expect(page.getByText(REVIEWER.fullName, { exact: true }).first()).toBeVisible();
      await expect(page.getByLabel('Choose review status')).toHaveValue('approved');
      await expect(page.getByText(`${BACKUP_COR.name} (backup)`)).toBeVisible();
      await expect(page.getByLabel('Add TTAC or Manager notes')).toHaveValue('Over to you');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText(
        `You sent request ${displayId} to the COR for approval on`
      );
      await expect(requestRow(page, displayId)).toContainText('COR approval pending');
    });

    await test.step('the creator sees the request read only while it awaits approval', async () => {
      await actAs(page, CREATOR.id);
      await page.goto(`/tta-requests/view/${ttaRequestId}`);

      // the COR it was sent to is in the header, and until they approve it there is nothing
      // finished to share or print
      await expect(page.getByText('Approver:').locator('..')).toContainText(BACKUP_COR.name);
      await expect(page.getByRole('button', { name: 'Print to PDF' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Copy URL Link' })).toHaveCount(0);

      await expect(
        page.getByRole('heading', { level: 2, name: 'TTA Request summary' })
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 3, name: 'Who is the request for?' })
      ).toBeVisible();

      // each section is the list right after its heading, as the reviewer laid it out
      const assignment = page.locator('h2:text-is("TTA assignment") + dl');
      await expect(assignment.locator('dt')).toHaveText('Assigned specialist');
      await expect(assignment.locator('dd')).toHaveText(REVIEWER.fullName);

      const review = page.locator('h2:text-is("Review and submit") + dl');
      await expect(review.locator('dt')).toHaveText('Date submitted');
      await expect(review.locator('dd')).toHaveText(/^\d{2}\/\d{2}\/\d{4}$/);

      // the reviewer's changes to the details were saved along with their review
      await expect(readOnlyValue(page, 'Recipient grant')).toContainText(OTHER_GRANT);
      await expect(readOnlyValue(page, 'Recipient grant')).not.toContainText(GRANT);
      await expect(readOnlyValue(page, 'Recipient aware of request')).toHaveText('No');
      await expect(readOnlyValue(page, 'Request originator')).toHaveText('Regional Office');
      await expect(readOnlyValue(page, "Recipient's Goal")).toHaveText(reviewerGoal);
      await expect(readOnlyValue(page, 'Request background or context')).toHaveText(
        REVIEWER_CONTEXT
      );

      // and their review: the note they left is the latest in the summary
      await expect(noteEntries(page)).toHaveCount(4);
      const reviewNote = noteEntries(page).nth(3);
      await expect(reviewNote.getByText(REVIEWER.fullName, { exact: true })).toBeVisible();
      await expect(reviewNote.getByText('Over to you', { exact: true })).toBeVisible();

      await expect(page.getByLabel('Choose review status')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Edit request' })).toHaveCount(0);
    });

    await test.step('the COR reviews the request read only and sends it back', async () => {
      await actAs(page, BACKUP_COR.id);
      await page.goto(`/tta-requests/view/${ttaRequestId}`);

      await expect(page.getByRole('heading', { name: 'TTA Request summary' })).toBeVisible();
      await expect(
        page.getByText(
          `${REVIEWER.name} is asking for a review of this TTA request. Please view all information, then select an approval status.`
        )
      ).toBeVisible();

      // everything on the request is read only, as the reviewer left it
      await expect(readOnlyValue(page, 'Recipient grant')).toContainText(OTHER_GRANT);
      await expect(readOnlyValue(page, "Recipient's Goal")).toHaveText(reviewerGoal);
      await expect(page.locator('h2:text-is("TTA assignment") + dl dd')).toHaveText(
        REVIEWER.fullName
      );
      await expect(page.getByRole('button', { name: 'Edit request' })).toHaveCount(0);
      await expect(page.getByLabel('Assign staff')).toHaveCount(0);

      await expect(noteEntries(page)).toHaveCount(4);
      await expectNote(noteEntries(page).nth(3), {
        phase: 'TTA Request review - sent to COR for approval',
        author: REVIEWER.fullName,
        role: 'Reviewer',
        note: 'Over to you',
      });

      await page.getByLabel('Choose approval status').selectOption('needs_action');
      await page.getByLabel('Add COR notes').fill('Please confirm the assigned specialist');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText(
        `You sent request ${displayId} back to its reviewer for changes on`
      );
      await expect(requestRow(page, displayId)).toContainText('TTAC/Manager review pending');
    });

    await test.step('the reviewer sees the COR note and sends it back to the creator', async () => {
      await actAs(page, REVIEWER.id);
      await page.goto(`/tta-requests/view/${ttaRequestId}`);

      // the request is back with the reviewer, so they review it again
      await expect(page.getByLabel('Choose review status')).toBeVisible();
      await expect(noteEntries(page)).toHaveCount(5);
      await expectNote(noteEntries(page).nth(4), {
        phase: 'TTA Request approval - needs action',
        author: BACKUP_COR.fullName,
        role: 'Approver',
        note: 'Please confirm the assigned specialist',
      });

      // the COR the reviewer picked is still picked after the COR sent the request back
      await page.getByLabel('Choose review status').selectOption('approved');
      await expect(page.getByText(`${BACKUP_COR.name} (backup)`)).toBeVisible();

      // but the creator has to confirm the specialist first
      await page.getByLabel('Choose review status').selectOption('needs_action');
      await page.getByLabel('Add TTAC or Manager notes').fill('Please confirm the specialist');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText(
        `You sent request ${displayId} back to its creator for changes on`
      );
      await expect(requestRow(page, displayId)).toContainText('Pending changes');
    });

    await test.step('the creator resubmits the request', async () => {
      await actAs(page, CREATOR.id);
      await page.goto(`/tta-requests/${ttaRequestId}`);
      await expect(page.getByRole('button', { name: 'Update request' })).toBeVisible();

      await page.getByLabel('Add creator notes').fill('Specialist confirmed');
      await page.getByRole('button', { name: 'Update request' }).click();

      await expect(
        page.getByRole('alert').filter({ hasText: `You submitted request ${displayId}` })
      ).toBeVisible();
      await expect(requestRow(page, displayId)).toContainText('TTAC/Manager review pending');
    });

    await test.step('the COR is still picked after the creator round trip', async () => {
      await actAs(page, REVIEWER.id);
      await page.goto(`/tta-requests/view/${ttaRequestId}`);
      await expect(noteEntries(page)).toHaveCount(7);

      // the reviewer needn't pick the COR again
      await page.getByLabel('Choose review status').selectOption('approved');
      await expect(page.getByText(`${BACKUP_COR.name} (backup)`)).toBeVisible();
      await page.getByLabel('Add TTAC or Manager notes').fill('Over to you again');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText(
        `You sent request ${displayId} to the COR for approval on`
      );
      await expect(requestRow(page, displayId)).toContainText('COR approval pending');
    });

    await test.step('the COR approves the request', async () => {
      await actAs(page, BACKUP_COR.id);
      await page.goto(`/tta-requests/view/${ttaRequestId}`);

      await expect(noteEntries(page)).toHaveCount(8);
      await page.getByLabel('Choose approval status').selectOption('approved');
      await page.getByLabel('Add COR notes').fill('Approved');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText(`You approved request ${displayId} on`);
      // an approved request moves from the active table to the approved one
      const approvedRow = requestRow(page, displayId, 'Approved TTA requests');
      await expect(approvedRow).toBeVisible();
      await expect(approvedRow).toContainText(REVIEWER.name);
      await expect(approvedRow).toContainText(/\d{2}\/\d{2}\/\d{4}/);
      await expect(requestRow(page, displayId)).toHaveCount(0);

      // read only for everyone now, with the approval the last note
      await page.goto(`/tta-requests/view/${ttaRequestId}`);
      await expect(page.getByLabel('Choose approval status')).toHaveCount(0);
      await expect(noteEntries(page)).toHaveCount(9);
      await expectNote(noteEntries(page).nth(8), {
        phase: 'TTA Request approval - approved',
        author: BACKUP_COR.fullName,
        role: 'Approver',
        note: 'Approved',
      });
    });

    await test.step("the request's goal is on the recipient's RTR", async () => {
      const [goal] = await rowsOf(
        await query(
          request,
          `SELECT g.id, g.name, g.status, gr."recipientId"
           FROM "TtaRequestGoals" trg
           JOIN "Goals" g ON g.id = trg."goalId"
           JOIN "Grants" gr ON gr.id = g."grantId"
           JOIN "TtaRequests" tr ON tr.id = trg."ttaRequestId"
           WHERE trg."ttaRequestId" = ${ttaRequestId}
             AND gr.number = '${OTHER_GRANT}'
             AND g."goalTemplateId" = tr."goalTemplateId";`
        )
      );
      expect(goal).toBeDefined();
      expect(goal.name).toBe(reviewerGoal);

      await page.goto(`/recipient-tta-records/${goal.recipientId}/region/${REGION_ID}/rttapa`);
      const card = page
        .getByTestId('goalCard')
        .filter({ has: page.locator(`#goal-select-${goal.id}`) });
      await expect(card).toBeVisible();
      await expect(card).toContainText(`Goal G-${goal.id}`);
      await expect(card).toContainText(reviewerGoal);
      await expect(card).toContainText(OTHER_GRANT);
    });

    await test.step("the request is in the recipient record's approved table", async () => {
      const [{ recipientId }] = await rowsOf(
        await query(request, `SELECT "recipientId" FROM "TtaRequests" WHERE id = ${ttaRequestId};`)
      );
      await page.goto(`/recipient-tta-records/${recipientId}/region/${REGION_ID}/tta-request`);

      const approvedRow = requestRow(page, displayId, 'Approved TTA requests');
      await expect(approvedRow).toBeVisible();
      await expect(approvedRow).toContainText(REVIEWER.name);
      await expect(requestRow(page, displayId)).toHaveCount(0);

      // an approved request opens read only, under the recipient's record
      await approvedRow.getByRole('link', { name: displayId, exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(
          `/recipient-tta-records/${recipientId}/region/${REGION_ID}/tta-request/view/${ttaRequestId}$`
        )
      );
      await expect(page.getByLabel('Choose approval status')).toHaveCount(0);
    });
  });

  test('the reviewer edits a request whose recipient has a single grant', async ({
    page,
    request,
  }) => {
    // no seeded recipient in the region has exactly one active grant, so this one is the test's
    // own; the form chooses a lone grant for the reviewer, which once looped until the page broke
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    const recipientId = Number(`18${suffix.slice(-7)}`);
    const grantId = Number(`19${suffix.slice(-7)}`);
    const grantNumber = `01PW${suffix.slice(-7)}`;
    let requestId: number | null = null;

    const api = async (userId: number, method: 'POST' | 'PUT', path: string, data: unknown) => {
      const response = await request.fetch(`/api/${path}`, {
        method,
        headers: { 'playwright-user-id': String(userId) },
        data,
      });
      expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBe(true);
      return response.json();
    };

    // React reports the loop as an error on the page, then renders nothing
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
      await query(
        request,
        `INSERT INTO "Recipients" (id, "name", "uei", "createdAt", "updatedAt")
         VALUES (${recipientId}, 'Playwright single grant recipient ${suffix}', '', NOW(), NOW());
         INSERT INTO "Grants"
           (id, number, "regionId", status, "startDate", "endDate", "recipientId", "createdAt", "updatedAt")
         VALUES (${grantId}, '${grantNumber}', ${REGION_ID}, 'Active', NOW(), NOW() + INTERVAL '1 year',
           ${recipientId}, NOW(), NOW());`
      );
      const [template] = await rowsOf(
        await query(
          request,
          `SELECT id FROM "GoalTemplates"
           WHERE "creationMethod" = 'Curated' AND standard IS NOT NULL AND standard <> 'Monitoring'
           ORDER BY id LIMIT 1;`
        )
      );

      const draft = await api(CREATOR.id, 'POST', 'tta-requests', { regionId: REGION_ID });
      requestId = Number(draft.id);
      await api(CREATOR.id, 'PUT', `tta-requests/${requestId}/submit`, {
        recipientId,
        grantIds: [grantId],
        recipientAware: true,
        originator: 'Recipient',
        goalTemplateId: Number(template.id),
        citations: [],
        context: '<p>Single grant context</p>',
        creatorNotes: '',
        reviewerId: REVIEWER.id,
      });

      await actAs(page, REVIEWER.id);
      await page.goto(`/tta-requests/view/${requestId}`);
      await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible();

      await page.getByRole('button', { name: 'Edit request' }).click();

      // the details are now the form, with the only grant chosen and shown rather than offered
      await expect(page.getByLabel('Who originated this request?')).toBeVisible();
      await expect(page.getByTestId('read-only-value')).toContainText(grantNumber);
      await expect(page.getByRole('checkbox', { name: new RegExp(grantNumber) })).toHaveCount(0);
      await expect(page.locator('#recipient-aware-yes')).toBeChecked();

      // and the rest of the review is still there to fill in
      await expect(page.getByRole('heading', { name: 'TTA Request summary' })).toBeVisible();
      await expect(page.getByLabel('Choose review status')).toBeVisible();
      await page.getByLabel('Choose review status').selectOption('needs_action');
      await expect(page.getByLabel('Choose review status')).toHaveValue('needs_action');

      expect(pageErrors).toEqual([]);
    } finally {
      // its grants, notes and reviewers cascade with the request
      if (requestId) {
        await query(request, `DELETE FROM "TtaRequests" WHERE id = ${requestId};`);
      }
      await query(
        request,
        `DELETE FROM "Grants" WHERE id = ${grantId};
         DELETE FROM "Recipients" WHERE id = ${recipientId};`
      );
    }
  });
});
