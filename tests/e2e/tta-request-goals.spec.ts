import { type APIRequestContext, expect, type Page, test } from '@playwright/test';
import { query } from '../utils/common';

/**
 * What approving a TTA request does to its goal, scenario by scenario, as the product spec sets
 * them out (see the TTAHUB-6015 scenario tables; numbers match the spec). Each scenario sets up
 * the goals and draft Activity Reports it starts from directly in the database, takes the
 * request to the COR through the API, and has the COR approve it in the browser, so what is
 * checked is what the approval did.
 *
 * Only what the spec states is checked. Cases the spec leaves open (unsuspending a goal with no
 * record of its status before, monitoring on only some of a request's grants, a monitoring goal
 * closed before approval) are not.
 *
 * Scenarios that turn on an Activity Report being approved (2, 6, 8, 10, 12, 14) or a goal
 * being closed on the RTTAPA (16, 18, 20) are not covered here.
 */

// Seeded users (see src/seeders/20201124160449-users.js), as in tta-request.spec.ts
const CREATOR = { id: 5 };
const REVIEWER = { id: 10 };
const BACKUP_COR = { id: 1 };
const REGION_ID = 1;
const READ_WRITE_TTA_REQUESTS = 10;
const REVIEW_TTA_REQUESTS = 11;
const BACKUP_APPROVE_TTA_REQUESTS = 13;
const FEATURE_FLAG = 'recipient_tta_request';

const RECIPIENT = 'Agency 2 in region 1, Inc.';
// the recipient's grant with no monitoring goal, which every scenario's goals are on
const GRANT = '09HP01112';
const MONITORING_STANDARD = 'Monitoring';

type Permission = { userId: number; scopeId: number };
const PERMISSIONS: Permission[] = [
  { userId: CREATOR.id, scopeId: READ_WRITE_TTA_REQUESTS },
  { userId: REVIEWER.id, scopeId: REVIEW_TTA_REQUESTS },
  { userId: BACKUP_COR.id, scopeId: BACKUP_APPROVE_TTA_REQUESTS },
];

// what this spec added, so cleanup leaves anything that was already there
const granted: Permission[] = [];
let addedFlag = false;
const templateIds: number[] = [];
const reportIds: number[] = [];
const requestIds: number[] = [];

let grantId: number;
let recipientId: number;
let monitoringTemplateId: number;

type Row = Record<string, unknown>;

const rowsOf = async (response: Awaited<ReturnType<typeof query>>) => {
  const [rows] = await response.json();
  return rows as Row[];
};

const sql = async (request: APIRequestContext, command: string) =>
  rowsOf(await query(request, command));

const actAs = (page: Page, userId: number) =>
  page.setExtraHTTPHeaders({ 'playwright-user-id': String(userId) });

/** calls the API as this user, failing the test on anything but a success */
async function api(
  request: APIRequestContext,
  userId: number,
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown
) {
  const response = await request.fetch(`/api/${path}`, {
    method,
    headers: { 'playwright-user-id': String(userId) },
    data,
  });
  expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}

/** a curated goal template of the scenario's own, so no scenario sees another's goals */
async function createTemplate(request: APIRequestContext, scenario: string) {
  const name = `(E2E TTA request ${scenario}) The recipient will work through scenario ${scenario}.`;
  const [{ id }] = await sql(
    request,
    `INSERT INTO "GoalTemplates"
       ("templateName", "creationMethod", "hash", "templateNameModifiedAt", "createdAt", "updatedAt")
     VALUES ('${name}', 'Curated', md5('${name}'), NOW(), NOW(), NOW())
     RETURNING id;`
  );
  templateIds.push(Number(id));
  return { id: Number(id), name };
}

/** a goal on the grant from the template, as the scenario starts with it */
async function createGoal(
  request: APIRequestContext,
  templateId: number,
  {
    status,
    createdVia,
    onApprovedAR = false,
  }: { status: string; createdVia: string; onApprovedAR?: boolean }
) {
  const [{ id }] = await sql(
    request,
    `INSERT INTO "Goals"
       ("name", "status", "grantId", "goalTemplateId", "createdVia", "onApprovedAR", "createdAt", "updatedAt")
     SELECT "templateName", '${status}', ${grantId}, id, '${createdVia}', ${onApprovedAR}, NOW(), NOW()
     FROM "GoalTemplates" WHERE id = ${templateId}
     RETURNING id;`
  );
  return Number(id);
}

/** records that the goal was suspended from this status */
async function recordSuspension(request: APIRequestContext, goalId: number, from: string) {
  await sql(
    request,
    `INSERT INTO "GoalStatusChanges"
       ("goalId", "userId", "userName", "oldStatus", "newStatus", "reason", "context",
        "performedAt", "createdAt", "updatedAt")
     VALUES (${goalId}, ${CREATOR.id}, 'Cucumber User', '${from}', 'Suspended',
       'Recipient request', 'e2e', NOW(), NOW(), NOW());`
  );
}

/** a draft Activity Report by the creator with the goal selected, which hides the goal */
async function draftReportWithGoal(request: APIRequestContext, goalId: number) {
  const [{ id }] = await sql(
    request,
    `INSERT INTO "ActivityReports"
       ("regionId", "userId", "submissionStatus", "calculatedStatus", "createdAt", "updatedAt")
     VALUES (${REGION_ID}, ${CREATOR.id}, 'draft', 'draft', NOW(), NOW())
     RETURNING id;`
  );
  reportIds.push(Number(id));
  await sql(
    request,
    `INSERT INTO "ActivityRecipients" ("activityReportId", "grantId", "createdAt", "updatedAt")
     VALUES (${id}, ${grantId}, NOW(), NOW());
     INSERT INTO "ActivityReportGoals" ("activityReportId", "goalId", "createdAt", "updatedAt")
     VALUES (${id}, ${goalId}, NOW(), NOW());`
  );
  return Number(id);
}

/** a request for the template, submitted by the creator and sent on to the COR by the reviewer */
async function awaitingApproval(request: APIRequestContext, goalTemplateId: number) {
  const draft = await api(request, CREATOR.id, 'POST', 'tta-requests', { regionId: REGION_ID });
  requestIds.push(draft.id);
  await api(request, CREATOR.id, 'PUT', `tta-requests/${draft.id}/submit`, {
    recipientId,
    grantIds: [grantId],
    recipientAware: true,
    originator: 'Recipient',
    goalTemplateId,
    citations: [],
    context: '<p>Scenario context</p>',
    creatorNotes: '',
    reviewerId: REVIEWER.id,
  });
  await api(request, REVIEWER.id, 'PUT', `tta-requests/${draft.id}/review`, {
    status: 'approved',
    assignedStaffIds: [REVIEWER.id],
    approverId: BACKUP_COR.id,
    note: '',
  });
  return Number(draft.id);
}

/** the COR approves the request on its page */
async function corApproves(page: Page, ttaRequestId: number) {
  await actAs(page, BACKUP_COR.id);
  await page.goto(`/tta-requests/view/${ttaRequestId}`);
  await page.getByLabel('Choose approval status').selectOption('approved');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/You approved request R01-REQ-\d+ on/);
}

/** the goals the request was linked to on approval */
const linkedGoals = (request: APIRequestContext, ttaRequestId: number) =>
  sql(
    request,
    `SELECT g.id, g.status, g."createdVia", g."deletedAt"
     FROM "TtaRequestGoals" trg JOIN "Goals" g ON g.id = trg."goalId"
     WHERE trg."ttaRequestId" = ${ttaRequestId}
     ORDER BY g.id;`
  );

/** every goal on the grant from the template, deleted or not, oldest first */
const templateGoals = (request: APIRequestContext, templateId: number) =>
  sql(
    request,
    `SELECT id, status, "createdVia", "deletedAt" FROM "Goals"
     WHERE "grantId" = ${grantId} AND "goalTemplateId" = ${templateId}
     ORDER BY id;`
  );

/** the goal's card on the recipient's RTTAPA */
async function rttapaCard(page: Page, goalId: number) {
  await actAs(page, BACKUP_COR.id);
  // the cards are loaded after the page, so wait for them before looking for one that may not be there
  const goalsLoaded = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/recipient/${recipientId}/region/${REGION_ID}/goals?`) &&
      response.ok()
  );
  await page.goto(`/recipient-tta-records/${recipientId}/region/${REGION_ID}/rttapa`);
  await goalsLoaded;
  return page.getByTestId('goalCard').filter({ has: page.locator(`#goal-select-${goalId}`) });
}

test.describe('TTA request approval and its goal', () => {
  test.setTimeout(120000);

  test.beforeAll(async ({ request }) => {
    for (const { userId, scopeId } of PERMISSIONS) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await sql(
        request,
        `SELECT 1 FROM "Permissions"
         WHERE "userId" = ${userId} AND "regionId" = ${REGION_ID} AND "scopeId" = ${scopeId};`
      );
      if (!existing.length) {
        // eslint-disable-next-line no-await-in-loop
        await sql(
          request,
          `INSERT INTO "Permissions" ("userId", "regionId", "scopeId", "createdAt", "updatedAt")
           VALUES (${userId}, ${REGION_ID}, ${scopeId}, NOW(), NOW());`
        );
        granted.push({ userId, scopeId });
      }
    }

    const flagged = await sql(
      request,
      `SELECT 1 FROM "Users" WHERE id = ${CREATOR.id} AND '${FEATURE_FLAG}' = ANY(flags);`
    );
    if (!flagged.length) {
      await sql(
        request,
        `UPDATE "Users" SET flags = array_append(flags, '${FEATURE_FLAG}') WHERE id = ${CREATOR.id};`
      );
      addedFlag = true;
    }

    const [grant] = await sql(
      request,
      `SELECT id, "recipientId" FROM "Grants" WHERE number = '${GRANT}';`
    );
    grantId = Number(grant.id);
    recipientId = Number(grant.recipientId);

    const [monitoring] = await sql(
      request,
      `SELECT id FROM "GoalTemplates" WHERE standard = '${MONITORING_STANDARD}';`
    );
    monitoringTemplateId = Number(monitoring.id);
  });

  test.afterAll(async ({ request }) => {
    if (requestIds.length) {
      // their grants, notes, reviewers, approvers, assigned staff and goal links cascade with them
      await sql(request, `DELETE FROM "TtaRequests" WHERE id IN (${requestIds.join(', ')});`);
    }
    if (reportIds.length) {
      const ids = reportIds.join(', ');
      await sql(request, `DELETE FROM "ActivityReportGoals" WHERE "activityReportId" IN (${ids});`);
      await sql(request, `DELETE FROM "ActivityRecipients" WHERE "activityReportId" IN (${ids});`);
      await sql(request, `DELETE FROM "ActivityReports" WHERE id IN (${ids});`);
    }
    if (templateIds.length) {
      const goals = `SELECT id FROM "Goals" WHERE "goalTemplateId" IN (${templateIds.join(', ')})`;
      await sql(request, `DELETE FROM "GoalStatusChanges" WHERE "goalId" IN (${goals});`);
      await sql(request, `DELETE FROM "GoalCollaborators" WHERE "goalId" IN (${goals});`);
      await sql(request, `DELETE FROM "Objectives" WHERE "goalId" IN (${goals});`);
      await sql(request, `DELETE FROM "Goals" WHERE id IN (${goals});`);
      await sql(request, `DELETE FROM "GoalTemplates" WHERE id IN (${templateIds.join(', ')});`);
    }
    for (const { userId, scopeId } of granted) {
      // eslint-disable-next-line no-await-in-loop
      await sql(
        request,
        `DELETE FROM "Permissions"
         WHERE "userId" = ${userId} AND "regionId" = ${REGION_ID} AND "scopeId" = ${scopeId};`
      );
    }
    if (addedFlag) {
      await sql(
        request,
        `UPDATE "Users" SET flags = array_remove(flags, '${FEATURE_FLAG}') WHERE id = ${CREATOR.id};`
      );
    }
  });

  test('1 and 3: approval takes over the goal a draft report created, and keeps it when the report is deleted', async ({
    page,
    request,
  }) => {
    const template = await createTemplate(request, '1');
    const goalId = await createGoal(request, template.id, {
      status: 'Not Started',
      createdVia: 'activityReport',
    });
    const reportId = await draftReportWithGoal(request, goalId);
    const ttaRequestId = await awaitingApproval(request, template.id);

    await test.step('the draft report hides its goal from the RTTAPA', async () => {
      await expect(await rttapaCard(page, goalId)).toHaveCount(0);
    });

    await test.step('scenario 1: approval takes over the goal, Not Started', async () => {
      await corApproves(page, ttaRequestId);

      expect(await linkedGoals(request, ttaRequestId)).toEqual([
        expect.objectContaining({ id: goalId, status: 'Not Started', createdVia: 'ttaRequest' }),
      ]);
      expect(await templateGoals(request, template.id)).toHaveLength(1);
      await expect(await rttapaCard(page, goalId)).toBeVisible();
    });

    await test.step('scenario 3: deleting the draft report leaves the goal Not Started', async () => {
      await api(request, CREATOR.id, 'DELETE', `activity-reports/${reportId}`);

      expect(await templateGoals(request, template.id)).toEqual([
        expect.objectContaining({ id: goalId, status: 'Not Started', deletedAt: null }),
      ]);
      await expect(await rttapaCard(page, goalId)).toBeVisible();
    });
  });

  test('5: approval takes over the one goal several draft reports share', async ({
    page,
    request,
  }) => {
    const template = await createTemplate(request, '5');
    const goalId = await createGoal(request, template.id, {
      status: 'Not Started',
      createdVia: 'activityReport',
    });
    await draftReportWithGoal(request, goalId);
    await draftReportWithGoal(request, goalId);
    const ttaRequestId = await awaitingApproval(request, template.id);

    await corApproves(page, ttaRequestId);

    expect(await linkedGoals(request, ttaRequestId)).toEqual([
      expect.objectContaining({ id: goalId, status: 'Not Started', createdVia: 'ttaRequest' }),
    ]);
    expect(await templateGoals(request, template.id)).toHaveLength(1);
  });

  test('7: approval takes over the goal a draft report added while the request was in review', async ({
    page,
    request,
  }) => {
    const template = await createTemplate(request, '7');
    const ttaRequestId = await awaitingApproval(request, template.id);
    const goalId = await createGoal(request, template.id, {
      status: 'Not Started',
      createdVia: 'activityReport',
    });
    await draftReportWithGoal(request, goalId);

    await corApproves(page, ttaRequestId);

    expect(await linkedGoals(request, ttaRequestId)).toEqual([
      expect.objectContaining({ id: goalId, status: 'Not Started', createdVia: 'ttaRequest' }),
    ]);
    expect(await templateGoals(request, template.id)).toHaveLength(1);
  });

  test('9: approval links the Not Started goal on the RTTAPA, which stays Not Started', async ({
    page,
    request,
  }) => {
    const template = await createTemplate(request, '9');
    const goalId = await createGoal(request, template.id, {
      status: 'Not Started',
      createdVia: 'rtr',
    });
    const ttaRequestId = await awaitingApproval(request, template.id);

    await corApproves(page, ttaRequestId);

    expect(await linkedGoals(request, ttaRequestId)).toEqual([
      expect.objectContaining({ id: goalId, status: 'Not Started', createdVia: 'rtr' }),
    ]);
    expect(await templateGoals(request, template.id)).toHaveLength(1);
  });

  test("11: approval takes over the draft report's new iteration of a closed goal", async ({
    page,
    request,
  }) => {
    const template = await createTemplate(request, '11');
    const closedId = await createGoal(request, template.id, {
      status: 'Closed',
      createdVia: 'rtr',
    });
    const iterationId = await createGoal(request, template.id, {
      status: 'Not Started',
      createdVia: 'activityReport',
    });
    await draftReportWithGoal(request, iterationId);
    const ttaRequestId = await awaitingApproval(request, template.id);

    await corApproves(page, ttaRequestId);

    expect(await linkedGoals(request, ttaRequestId)).toEqual([
      expect.objectContaining({ id: iterationId, status: 'Not Started', createdVia: 'ttaRequest' }),
    ]);
    expect(await templateGoals(request, template.id)).toEqual([
      expect.objectContaining({ id: closedId, status: 'Closed' }),
      expect.objectContaining({ id: iterationId }),
    ]);
    await expect(await rttapaCard(page, iterationId)).toBeVisible();
  });

  for (const [scenario, before] of [
    ['13a', 'Not Started'],
    ['13b', 'In Progress'],
  ]) {
    test(`${scenario}: approval unsuspends a goal that was ${before} before it was suspended`, async ({
      page,
      request,
    }) => {
      const template = await createTemplate(request, scenario);
      const goalId = await createGoal(request, template.id, {
        status: 'Suspended',
        createdVia: 'rtr',
      });
      await recordSuspension(request, goalId, before);
      await draftReportWithGoal(request, goalId);
      const ttaRequestId = await awaitingApproval(request, template.id);

      await corApproves(page, ttaRequestId);

      expect(await linkedGoals(request, ttaRequestId)).toEqual([
        expect.objectContaining({ id: goalId, status: before }),
      ]);
      const [change] = await sql(
        request,
        `SELECT "oldStatus", "newStatus", "userId" FROM "GoalStatusChanges"
         WHERE "goalId" = ${goalId} AND "oldStatus" = 'Suspended';`
      );
      expect(change).toEqual({ oldStatus: 'Suspended', newStatus: before, userId: BACKUP_COR.id });
    });
  }

  test('17: approval after the goal was closed creates a new one, Not Started', async ({
    page,
    request,
  }) => {
    const template = await createTemplate(request, '17');
    const goalId = await createGoal(request, template.id, {
      status: 'In Progress',
      createdVia: 'rtr',
      onApprovedAR: true,
    });
    const ttaRequestId = await awaitingApproval(request, template.id);
    // an RTTAPA user closes the goal while the request is pending
    await sql(request, `UPDATE "Goals" SET status = 'Closed' WHERE id = ${goalId};`);

    await corApproves(page, ttaRequestId);

    const [linked] = await linkedGoals(request, ttaRequestId);
    expect(linked).toEqual(
      expect.objectContaining({ status: 'Not Started', createdVia: 'ttaRequest' })
    );
    expect(linked.id).not.toBe(goalId);
    expect(await templateGoals(request, template.id)).toEqual([
      expect.objectContaining({ id: goalId, status: 'Closed' }),
      expect.objectContaining({ id: linked.id }),
    ]);
  });

  test('19: the second of two requests links the goal the first created, with no status change', async ({
    page,
    request,
  }) => {
    const template = await createTemplate(request, '19');
    const first = await awaitingApproval(request, template.id);
    const second = await awaitingApproval(request, template.id);

    await corApproves(page, first);
    const [created] = await linkedGoals(request, first);
    expect(created).toEqual(
      expect.objectContaining({ status: 'Not Started', createdVia: 'ttaRequest' })
    );

    await corApproves(page, second);
    expect(await linkedGoals(request, second)).toEqual([
      expect.objectContaining({ id: created.id, status: 'Not Started' }),
    ]);
    expect(await templateGoals(request, template.id)).toHaveLength(1);
  });

  test('21: a request for monitoring with no monitoring goal is approved without one', async ({
    page,
    request,
  }) => {
    expect(await templateGoals(request, monitoringTemplateId)).toEqual([]);

    await test.step('the creator is offered the monitoring goal for the grant', async () => {
      await actAs(page, CREATOR.id);
      await page.goto('/tta-requests');
      await page.getByRole('link', { name: 'Add request' }).click();
      await page.locator('#recipient').click();
      await page.getByRole('option', { name: RECIPIENT }).first().click();
      await page.locator('label', { hasText: GRANT }).click();
      await page.locator('#goal').click();
      await expect(page.getByRole('option', { name: /\(Monitoring\)/ })).toBeVisible();
    });

    await test.step('approving it creates no goal', async () => {
      const ttaRequestId = await awaitingApproval(request, monitoringTemplateId);

      await corApproves(page, ttaRequestId);

      expect(await linkedGoals(request, ttaRequestId)).toEqual([]);
      expect(await templateGoals(request, monitoringTemplateId)).toEqual([]);
    });
  });
});
