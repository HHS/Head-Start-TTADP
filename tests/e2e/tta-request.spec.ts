import { expect, type Locator, type Page, test } from '@playwright/test';
import { query } from '../utils/common';

// Seeded users (see src/seeders/20201124160449-users.js): the creator writes TTA requests in
// region 1, the reviewer reviews them there, and a backup COR approves them there. None has
// these TTA request permissions in the seed data, so the spec grants them and takes back only
// what it granted. The reviewer is a GS whose home region is 1, so they can assign themselves.
const CREATOR = { id: 5, name: 'Cucumber User', fullName: 'Cucumber User, GS' };
const REVIEWER = { id: 10, name: 'adam', fullName: 'adam, GS', withRole: 'adam (GS)' };
const BACKUP_COR = { id: 1, name: 'Hermione Granger' };
const REGION_ID = 1;
const READ_WRITE_TTA_REQUESTS = 10;
const REVIEW_TTA_REQUESTS = 11;
const BACKUP_APPROVE_TTA_REQUESTS = 13;
const FEATURE_FLAG = 'recipient_tta_request';

const RECIPIENT = 'Agency 2 in region 1, Inc.';
const GRANT = '09HP01111';
// the recipient's other grant, which the reviewer switches the request to
const OTHER_GRANT = '09HP01112';
// the monitoring goal is only offered for a grant that already has one, and this grant has no
// monitoring report, so it has no citations to choose
const MONITORING_TEMPLATE_STANDARD = 'Monitoring';

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
let monitoringGoalId: number | null = null;
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
  { phase, author, role, note }: { phase: string; author: string; role: string; note: string }
) {
  await expect(entry.getByText(phase, { exact: true })).toBeVisible();
  await expect(entry.getByText(author, { exact: true })).toBeVisible();
  await expect(entry.getByText(role, { exact: true })).toBeVisible();
  await expect(entry.getByText(note, { exact: true })).toBeVisible();
  await expect(entry).toContainText(NOTE_DATE);
}

/** the value under a label in a read-only section of the request */
const readOnlyValue = (page: Page, label: string): Locator =>
  page.locator(`div:text-is("${label}") + div`);

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

    const monitoringGoals = await rowsOf(
      await query(
        request,
        `SELECT 1 FROM "Goals" g
         JOIN "Grants" gr ON gr.id = g."grantId"
         JOIN "GoalTemplates" gt ON gt.id = g."goalTemplateId"
         WHERE gr.number = '${GRANT}' AND gt.standard = '${MONITORING_TEMPLATE_STANDARD}';`
      )
    );
    if (!monitoringGoals.length) {
      const [goal] = await rowsOf(
        await query(
          request,
          `INSERT INTO "Goals" ("name", "status", "grantId", "goalTemplateId", "createdAt", "updatedAt")
           SELECT gt."templateName", 'Not Started', gr.id, gt.id, NOW(), NOW()
           FROM "Grants" gr, "GoalTemplates" gt
           WHERE gr.number = '${GRANT}' AND gt.standard = '${MONITORING_TEMPLATE_STANDARD}'
           RETURNING id;`
        )
      );
      monitoringGoalId = Number(goal.id);
    }
  });

  test.afterAll(async ({ request }) => {
    // its grants, citations, approvers, notes and assigned staff cascade with it
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
    if (monitoringGoalId) {
      await query(request, `DELETE FROM "Goals" WHERE id = ${monitoringGoalId};`);
    }
  });

  test.setTimeout(120000);

  test('the creator resubmits a request the reviewer sent back for changes', async ({ page }) => {
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

      await expect(page.getByRole('heading', { name: 'TTA assignment' })).toBeVisible();
      await assignStaff(page, REVIEWER.fullName);
      await page.getByLabel('Choose review status').selectOption('needs_action');
      await page.getByLabel('Add TTAC or Manager notes').fill('Please add the agenda');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText(
        `You sent request ${displayId} back to its creator for changes on`
      );
      await expect(requestRow(page, displayId)).toContainText('Needs action');
      // the reviewer is an admin, and an admin can also edit a request sent back for changes
      await expect(
        requestRow(page, displayId).getByRole('link', { name: 'Needs action' })
      ).toBeVisible();
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
        `Needs action from ${REVIEWER.withRole}`
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
      await expect(requestRow(page, displayId)).toContainText('Awaiting approval');
    });

    await test.step('the creator sees the request read only while it awaits approval', async () => {
      await actAs(page, CREATOR.id);
      await page.goto(`/tta-requests/view/${ttaRequestId}`);

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
  });
});
