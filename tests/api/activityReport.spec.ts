import { expect, test } from '@playwright/test';
import Joi from 'joi';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../../src/constants';
import SCOPES from '../../src/middleware/scopeConstants';
import { query } from '../utils/common';
import { root, validateSchema } from './common';

const userHeaders = { 'playwright-user-id': '1' };

test.describe('get /activity-reports/goals', () => {
  test('200', async ({ request }) => {
    const response = await request.get(
      `${root}/activity-reports/goals?grantIds=1&reportStartDate=2023-01-01`,
      { headers: userHeaders }
    );
    const goalForGrant = Joi.object({
      grantIds: Joi.array().items(Joi.number()).required(),
      goalIds: Joi.array().items(Joi.number()).required(),
      oldGrantIds: Joi.array().items(Joi.any()).required(),
      created: Joi.any().required(),
      goalTemplateId: Joi.number().required(),
      name: Joi.string().required(),
      status: Joi.string().required(),
      onApprovedAR: Joi.boolean().required(),
      source: Joi.any(),
      createdVia: Joi.any(),
    });
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(goalForGrant);

    await validateSchema(response, schema, expect);
  });
});

test.describe('post /activity-reports/goals', () => {
  test('does not save not started when a draft save reuses an in progress objective', async ({
    request,
  }) => {
    const suffix = Date.now().toString();
    const recipientId = Number(`18${suffix.slice(-7)}`);
    const grantId = Number(`19${suffix.slice(-7)}`);
    const objectiveTitle = `Playwright reused objective ${suffix}`;
    const ttaProvided = 'Playwright TTA for reused objective';
    const updatedTtaProvided = 'Updated Playwright TTA for reused objective';

    type CreatedIds = {
      recipientId: number;
      grantId: number;
      goalTemplateId: number;
      reportId: number;
      sourceReportId: number;
      goalId: number;
      objectiveId: number;
    };

    let ids: CreatedIds | null = null;
    let insertedWritePermission = false;

    const cleanup = async () => {
      if (insertedWritePermission) {
        await query(
          request,
          `
          DELETE FROM "Permissions"
          WHERE "userId" = 1
            AND "scopeId" = ${SCOPES.READ_WRITE_REPORTS}
            AND "regionId" = 1;
          `
        );
      }

      if (!ids) {
        return;
      }

      await query(
        request,
        `
        BEGIN;
        DELETE FROM "ActivityReportObjectiveTopics"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives" WHERE "activityReportId" = ${ids.reportId}
        );
        DELETE FROM "ActivityReportObjectiveCourses"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives" WHERE "activityReportId" = ${ids.reportId}
        );
        DELETE FROM "ActivityReportObjectiveFiles"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives" WHERE "activityReportId" = ${ids.reportId}
        );
        DELETE FROM "ActivityReportObjectiveResources"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives" WHERE "activityReportId" = ${ids.reportId}
        );
        DELETE FROM "ActivityReportObjectiveCitations"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives" WHERE "activityReportId" = ${ids.reportId}
        );
        DELETE FROM "ActivityReportObjectives"
        WHERE "activityReportId" = ${ids.reportId} OR "objectiveId" = ${ids.objectiveId};
        DELETE FROM "ActivityReportGoalFieldResponses"
        WHERE "activityReportGoalId" IN (
          SELECT id FROM "ActivityReportGoals" WHERE "activityReportId" = ${ids.reportId}
        );
        DELETE FROM "ActivityReportGoals"
        WHERE "activityReportId" = ${ids.reportId} OR "goalId" = ${ids.goalId};
        DELETE FROM "GoalFieldResponses" WHERE "goalId" = ${ids.goalId};
        DELETE FROM "GoalStatusChanges" WHERE "goalId" = ${ids.goalId};
        DELETE FROM "Objectives" WHERE id = ${ids.objectiveId};
        DELETE FROM "Goals" WHERE id = ${ids.goalId};
        DELETE FROM "ActivityRecipients"
        WHERE "activityReportId" IN (${ids.reportId}, ${ids.sourceReportId}) OR "grantId" = ${ids.grantId};
        DELETE FROM "ActivityReports" WHERE id IN (${ids.reportId}, ${ids.sourceReportId});
        DELETE FROM "GoalTemplates" WHERE id = ${ids.goalTemplateId};
        DELETE FROM "Grants" WHERE id = ${ids.grantId};
        DELETE FROM "Recipients" WHERE id = ${ids.recipientId};
        COMMIT;
        `
      );
    };

    try {
      const setupResponse = await query(
        request,
        `
        WITH recipient AS (
          INSERT INTO "Recipients" (id, "name", "uei", "createdAt", "updatedAt")
          VALUES (
            ${recipientId},
            'Playwright objective status recipient ${suffix}',
            'NNA5N2KHMGN2',
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        grant_row AS (
          INSERT INTO "Grants" (
            id,
            number,
            "regionId",
            status,
            "startDate",
            "endDate",
            "recipientId",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${grantId},
            '99PW${suffix.slice(-7)}',
            1,
            'Active',
            NOW(),
            NOW(),
            (SELECT id FROM recipient),
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        goal_template AS (
          INSERT INTO "GoalTemplates" (
            hash,
            "templateName",
            "creationMethod",
            "templateNameModifiedAt",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            'playwright-objective-status-${suffix}',
            'Playwright objective status template ${suffix}',
            'Curated',
            NOW(),
            NOW(),
            NOW()
          )
          RETURNING id, "templateName"
        ),
        draft_report AS (
          INSERT INTO "ActivityReports" (
            "activityRecipientType",
            "regionId",
            "ECLKCResourcesUsed",
            "submissionStatus",
            "calculatedStatus",
            "numberOfParticipants",
            "deliveryMethod",
            duration,
            "endDate",
            "startDate",
            requester,
            "targetPopulations",
            reason,
            participants,
            topics,
            "ttaType",
            version,
            "pageState",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            'recipient',
            1,
            ARRAY['test']::text[],
            'draft',
            'draft',
            1,
            'method',
            1.0,
            '2050-01-01',
            '2050-01-01',
            'requester',
            ARRAY['pop']::text[],
            ARRAY['reason']::text[],
            ARRAY['participants']::text[],
            ARRAY['topics']::text[],
            ARRAY['technical-assistance']::text[],
            2,
            '{}'::json,
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        source_report AS (
          INSERT INTO "ActivityReports" (
            "activityRecipientType",
            "regionId",
            "ECLKCResourcesUsed",
            "submissionStatus",
            "calculatedStatus",
            "numberOfParticipants",
            "deliveryMethod",
            duration,
            "endDate",
            "startDate",
            requester,
            "targetPopulations",
            reason,
            participants,
            topics,
            "ttaType",
            version,
            "pageState",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            'recipient',
            1,
            ARRAY['test']::text[],
            'approved',
            'approved',
            1,
            'method',
            1.0,
            '2050-01-01',
            '2050-01-01',
            'requester',
            ARRAY['pop']::text[],
            ARRAY['reason']::text[],
            ARRAY['participants']::text[],
            ARRAY['topics']::text[],
            ARRAY['technical-assistance']::text[],
            2,
            '{}'::json,
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        activity_recipient AS (
          INSERT INTO "ActivityRecipients" ("activityReportId", "grantId", "createdAt", "updatedAt")
          VALUES ((SELECT id FROM draft_report), (SELECT id FROM grant_row), NOW(), NOW())
          RETURNING id
        ),
        goal_row AS (
          INSERT INTO "Goals" (
            name,
            status,
            "grantId",
            "goalTemplateId",
            "createdVia",
            "onAR",
            "onApprovedAR",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            (SELECT "templateName" FROM goal_template),
            '${GOAL_STATUS.IN_PROGRESS}',
            (SELECT id FROM grant_row),
            (SELECT id FROM goal_template),
            'rtr',
            false,
            false,
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        objective_row AS (
          INSERT INTO "Objectives" (
            title,
            status,
            "goalId",
            "createdVia",
            "createdViaActivityReportId",
            "onAR",
            "onApprovedAR",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            '${objectiveTitle}',
            '${OBJECTIVE_STATUS.IN_PROGRESS}',
            (SELECT id FROM goal_row),
            'activityReport',
            (SELECT id FROM source_report),
            true,
            true,
            NOW(),
            NOW()
          )
          RETURNING id
        )
        SELECT
          (SELECT id FROM recipient) AS "recipientId",
          (SELECT id FROM grant_row) AS "grantId",
          (SELECT id FROM goal_template) AS "goalTemplateId",
          (SELECT id FROM draft_report) AS "reportId",
          (SELECT id FROM source_report) AS "sourceReportId",
          (SELECT id FROM goal_row) AS "goalId",
          (SELECT id FROM objective_row) AS "objectiveId";
        `
      );

      const [setupRows] = await setupResponse.json();
      const createdIds = setupRows[0] as CreatedIds;
      ids = createdIds;

      const permissionResponse = await query(
        request,
        `
        SELECT COUNT(*)::int AS count
        FROM "Permissions"
        WHERE "userId" = 1
          AND "scopeId" = ${SCOPES.READ_WRITE_REPORTS}
          AND "regionId" = 1;
        `
      );
      const [permissionRows] = await permissionResponse.json();

      if (Number(permissionRows[0].count) === 0) {
        await query(
          request,
          `
          INSERT INTO "Permissions" ("userId", "scopeId", "regionId", "createdAt", "updatedAt")
          VALUES (1, ${SCOPES.READ_WRITE_REPORTS}, 1, NOW(), NOW());
          `
        );
        insertedWritePermission = true;
      }

      const firstSavePayload = {
        goals: [
          {
            goalIds: [createdIds.goalId],
            grantIds: [createdIds.grantId],
            goalTemplateId: createdIds.goalTemplateId,
            name: `Playwright objective status template ${suffix}`,
            status: GOAL_STATUS.IN_PROGRESS,
            prompts: [],
            isActivelyBeingEditing: true,
            objectives: [
              {
                id: null,
                isNew: true,
                ttaProvided,
                title: objectiveTitle,
                status: OBJECTIVE_STATUS.NOT_STARTED,
                topics: [],
                resources: [],
                files: [],
                courses: [],
                supportType: 'Implementing',
                createdHere: true,
              },
            ],
          },
        ],
        activityReportId: createdIds.reportId,
        regionId: 1,
      };

      const firstSave = await request.post(`${root}/activity-reports/goals`, {
        data: firstSavePayload,
        headers: userHeaders,
      });

      expect(firstSave.status()).toBe(200);
      const firstSaveGoals = await firstSave.json();
      expect(firstSaveGoals[0].objectives[0].status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
      expect(firstSaveGoals[0].objectives[0].objectiveCreatedHere).toBeNull();

      const secondSave = await request.post(`${root}/activity-reports/goals`, {
        data: {
          ...firstSavePayload,
          goals: [
            {
              ...firstSavePayload.goals[0],
              objectives: [
                {
                  ...firstSavePayload.goals[0].objectives[0],
                  id: createdIds.objectiveId,
                  ids: [createdIds.objectiveId],
                  isNew: false,
                  ttaProvided: updatedTtaProvided,
                  status: OBJECTIVE_STATUS.NOT_STARTED,
                  createdHere: true,
                },
              ],
            },
          ],
        },
        headers: userHeaders,
      });

      expect(secondSave.status()).toBe(200);
      const secondSaveGoals = await secondSave.json();
      expect(secondSaveGoals[0].objectives[0].status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
      expect(secondSaveGoals[0].objectives[0].objectiveCreatedHere).toBeNull();

      const aroResponse = await query(
        request,
        `
        SELECT status, "objectiveCreatedHere", "ttaProvided"
        FROM "ActivityReportObjectives"
        WHERE "activityReportId" = ${createdIds.reportId}
          AND "objectiveId" = ${createdIds.objectiveId};
        `
      );
      const [aroRows] = await aroResponse.json();
      expect(aroRows).toHaveLength(1);
      expect(aroRows[0].status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
      expect(aroRows[0].objectiveCreatedHere).toBe(false);
      expect(aroRows[0].ttaProvided).toBe(updatedTtaProvided);
    } finally {
      await cleanup();
    }
  });

  test('reuses an objective created on a previous report when a later report creates the same title', async ({
    request,
  }) => {
    const suffix = Date.now().toString();
    const recipientId = Number(`18${suffix.slice(-7)}`);
    const grantId = Number(`19${suffix.slice(-7)}`);
    const objectiveTitle = `Playwright duplicate-title objective ${suffix}`;
    const priorTtaProvided = 'Prior report TTA for duplicate-title objective';
    const laterTtaProvided = 'Later report TTA for duplicate-title objective';

    type CreatedIds = {
      recipientId: number;
      grantId: number;
      goalTemplateId: number;
      priorReportId: number;
      laterReportId: number;
      goalId: number;
    };

    let ids: CreatedIds | null = null;
    let priorObjectiveId: number | null = null;
    let insertedWritePermission = false;

    const cleanup = async () => {
      if (insertedWritePermission) {
        await query(
          request,
          `
          DELETE FROM "Permissions"
          WHERE "userId" = 1
            AND "scopeId" = ${SCOPES.READ_WRITE_REPORTS}
            AND "regionId" = 1;
          `
        );
      }

      if (!ids) {
        return;
      }

      await query(
        request,
        `
        BEGIN;
        DELETE FROM "ActivityReportObjectiveTopics"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives"
          WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
        );
        DELETE FROM "ActivityReportObjectiveCourses"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives"
          WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
        );
        DELETE FROM "ActivityReportObjectiveFiles"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives"
          WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
        );
        DELETE FROM "ActivityReportObjectiveResources"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives"
          WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
        );
        DELETE FROM "ActivityReportObjectiveCitations"
        WHERE "activityReportObjectiveId" IN (
          SELECT id FROM "ActivityReportObjectives"
          WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
        );
        DELETE FROM "ActivityReportObjectives"
        WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
          OR "objectiveId" IN (SELECT id FROM "Objectives" WHERE "goalId" = ${ids.goalId});
        DELETE FROM "ActivityReportGoalFieldResponses"
        WHERE "activityReportGoalId" IN (
          SELECT id FROM "ActivityReportGoals"
          WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
        );
        DELETE FROM "ActivityReportGoals"
        WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
          OR "goalId" = ${ids.goalId};
        DELETE FROM "GoalFieldResponses" WHERE "goalId" = ${ids.goalId};
        DELETE FROM "GoalStatusChanges" WHERE "goalId" = ${ids.goalId};
        DELETE FROM "Objectives" WHERE "goalId" = ${ids.goalId};
        DELETE FROM "Goals" WHERE id = ${ids.goalId};
        DELETE FROM "ActivityRecipients"
        WHERE "activityReportId" IN (${ids.priorReportId}, ${ids.laterReportId})
          OR "grantId" = ${ids.grantId};
        DELETE FROM "ActivityReports" WHERE id IN (${ids.priorReportId}, ${ids.laterReportId});
        DELETE FROM "GoalTemplates" WHERE id = ${ids.goalTemplateId};
        DELETE FROM "Grants" WHERE id = ${ids.grantId};
        DELETE FROM "Recipients" WHERE id = ${ids.recipientId};
        COMMIT;
        `
      );
    };

    try {
      const setupResponse = await query(
        request,
        `
        WITH recipient AS (
          INSERT INTO "Recipients" (id, "name", "uei", "createdAt", "updatedAt")
          VALUES (
            ${recipientId},
            'Playwright duplicate-title recipient ${suffix}',
            'NNA5N2KHMGN2',
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        grant_row AS (
          INSERT INTO "Grants" (
            id,
            number,
            "regionId",
            status,
            "startDate",
            "endDate",
            "recipientId",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${grantId},
            '99DT${suffix.slice(-7)}',
            1,
            'Active',
            NOW(),
            NOW(),
            (SELECT id FROM recipient),
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        goal_template AS (
          INSERT INTO "GoalTemplates" (
            hash,
            "templateName",
            "creationMethod",
            "templateNameModifiedAt",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            'playwright-duplicate-title-${suffix}',
            'Playwright duplicate-title template ${suffix}',
            'Curated',
            NOW(),
            NOW(),
            NOW()
          )
          RETURNING id, "templateName"
        ),
        prior_report AS (
          INSERT INTO "ActivityReports" (
            "activityRecipientType",
            "regionId",
            "ECLKCResourcesUsed",
            "submissionStatus",
            "calculatedStatus",
            "numberOfParticipants",
            "deliveryMethod",
            duration,
            "endDate",
            "startDate",
            requester,
            "targetPopulations",
            reason,
            participants,
            topics,
            "ttaType",
            version,
            "pageState",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            'recipient',
            1,
            ARRAY['test']::text[],
            'draft',
            'draft',
            1,
            'method',
            1.0,
            '2050-01-01',
            '2050-01-01',
            'requester',
            ARRAY['pop']::text[],
            ARRAY['reason']::text[],
            ARRAY['participants']::text[],
            ARRAY['topics']::text[],
            ARRAY['technical-assistance']::text[],
            2,
            '{}'::json,
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        later_report AS (
          INSERT INTO "ActivityReports" (
            "activityRecipientType",
            "regionId",
            "ECLKCResourcesUsed",
            "submissionStatus",
            "calculatedStatus",
            "numberOfParticipants",
            "deliveryMethod",
            duration,
            "endDate",
            "startDate",
            requester,
            "targetPopulations",
            reason,
            participants,
            topics,
            "ttaType",
            version,
            "pageState",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            'recipient',
            1,
            ARRAY['test']::text[],
            'draft',
            'draft',
            1,
            'method',
            1.0,
            '2050-01-01',
            '2050-01-01',
            'requester',
            ARRAY['pop']::text[],
            ARRAY['reason']::text[],
            ARRAY['participants']::text[],
            ARRAY['topics']::text[],
            ARRAY['technical-assistance']::text[],
            2,
            '{}'::json,
            NOW(),
            NOW()
          )
          RETURNING id
        ),
        prior_activity_recipient AS (
          INSERT INTO "ActivityRecipients" ("activityReportId", "grantId", "createdAt", "updatedAt")
          VALUES ((SELECT id FROM prior_report), (SELECT id FROM grant_row), NOW(), NOW())
          RETURNING id
        ),
        later_activity_recipient AS (
          INSERT INTO "ActivityRecipients" ("activityReportId", "grantId", "createdAt", "updatedAt")
          VALUES ((SELECT id FROM later_report), (SELECT id FROM grant_row), NOW(), NOW())
          RETURNING id
        ),
        goal_row AS (
          INSERT INTO "Goals" (
            name,
            status,
            "grantId",
            "goalTemplateId",
            "createdVia",
            "onAR",
            "onApprovedAR",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            (SELECT "templateName" FROM goal_template),
            '${GOAL_STATUS.IN_PROGRESS}',
            (SELECT id FROM grant_row),
            (SELECT id FROM goal_template),
            'rtr',
            false,
            false,
            NOW(),
            NOW()
          )
          RETURNING id
        )
        SELECT
          (SELECT id FROM recipient) AS "recipientId",
          (SELECT id FROM grant_row) AS "grantId",
          (SELECT id FROM goal_template) AS "goalTemplateId",
          (SELECT id FROM prior_report) AS "priorReportId",
          (SELECT id FROM later_report) AS "laterReportId",
          (SELECT id FROM goal_row) AS "goalId";
        `
      );

      const [setupRows] = await setupResponse.json();
      const createdIds = setupRows[0] as CreatedIds;
      ids = createdIds;

      const permissionResponse = await query(
        request,
        `
        SELECT COUNT(*)::int AS count
        FROM "Permissions"
        WHERE "userId" = 1
          AND "scopeId" = ${SCOPES.READ_WRITE_REPORTS}
          AND "regionId" = 1;
        `
      );
      const [permissionRows] = await permissionResponse.json();

      if (Number(permissionRows[0].count) === 0) {
        await query(
          request,
          `
          INSERT INTO "Permissions" ("userId", "scopeId", "regionId", "createdAt", "updatedAt")
          VALUES (1, ${SCOPES.READ_WRITE_REPORTS}, 1, NOW(), NOW());
          `
        );
        insertedWritePermission = true;
      }

      const goalPayload = (activityReportId: number, ttaProvided: string) => ({
        goals: [
          {
            goalIds: [createdIds.goalId],
            grantIds: [createdIds.grantId],
            goalTemplateId: createdIds.goalTemplateId,
            name: `Playwright duplicate-title template ${suffix}`,
            status: GOAL_STATUS.IN_PROGRESS,
            prompts: [],
            isActivelyBeingEditing: true,
            objectives: [
              {
                id: null,
                isNew: true,
                ttaProvided,
                title: objectiveTitle,
                status: OBJECTIVE_STATUS.NOT_STARTED,
                topics: [],
                resources: [],
                files: [],
                courses: [],
                supportType: 'Implementing',
                createdHere: true,
              },
            ],
          },
        ],
        activityReportId,
        regionId: 1,
      });

      const priorSave = await request.post(`${root}/activity-reports/goals`, {
        data: goalPayload(createdIds.priorReportId, priorTtaProvided),
        headers: userHeaders,
      });

      expect(priorSave.status()).toBe(200);
      const priorSaveGoals = await priorSave.json();
      priorObjectiveId = priorSaveGoals[0].objectives[0].id;

      await query(
        request,
        `
        UPDATE "Objectives"
        SET status = '${OBJECTIVE_STATUS.IN_PROGRESS}',
            "onApprovedAR" = true,
            "updatedAt" = NOW()
        WHERE id = ${priorObjectiveId};

        UPDATE "ActivityReportObjectives"
        SET status = '${OBJECTIVE_STATUS.IN_PROGRESS}',
            "objectiveCreatedHere" = false,
            "updatedAt" = NOW()
        WHERE "activityReportId" = ${createdIds.priorReportId}
          AND "objectiveId" = ${priorObjectiveId};

        UPDATE "ActivityReports"
        SET "submissionStatus" = 'approved',
            "calculatedStatus" = 'approved',
            "updatedAt" = NOW()
        WHERE id = ${createdIds.priorReportId};
        `
      );

      const laterSave = await request.post(`${root}/activity-reports/goals`, {
        data: goalPayload(createdIds.laterReportId, laterTtaProvided),
        headers: userHeaders,
      });

      expect(laterSave.status()).toBe(200);
      const laterSaveGoals = await laterSave.json();
      expect(laterSaveGoals[0].objectives[0].id).toBe(priorObjectiveId);
      expect(laterSaveGoals[0].objectives[0].status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
      expect(laterSaveGoals[0].objectives[0].objectiveCreatedHere).toBeNull();

      const objectiveResponse = await query(
        request,
        `
        SELECT id, status
        FROM "Objectives"
        WHERE "goalId" = ${createdIds.goalId}
          AND title = '${objectiveTitle}';
        `
      );
      const [objectiveRows] = await objectiveResponse.json();
      expect(objectiveRows).toHaveLength(1);
      expect(objectiveRows[0].id).toBe(priorObjectiveId);
      expect(objectiveRows[0].status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);

      const aroResponse = await query(
        request,
        `
        SELECT status, "objectiveCreatedHere", "ttaProvided"
        FROM "ActivityReportObjectives"
        WHERE "activityReportId" = ${createdIds.laterReportId}
          AND "objectiveId" = ${priorObjectiveId};
        `
      );
      const [aroRows] = await aroResponse.json();
      expect(aroRows).toHaveLength(1);
      expect(aroRows[0].status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
      expect(aroRows[0].objectiveCreatedHere).toBe(false);
      expect(aroRows[0].ttaProvided).toBe(laterTtaProvided);
    } finally {
      await cleanup();
    }
  });
});
