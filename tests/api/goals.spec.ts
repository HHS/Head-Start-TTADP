import { test, expect } from '@playwright/test';
import { CLOSE_SUSPEND_REASONS } from '@ttahub/common';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../../src/constants';

test('get /goals?reportId&goalTemplateId', async ({ request }) => {
  const response = await request.get(
    `${root}/goals?reportId=10000&goalTemplateId=1`,
    { headers: { 'playwright-user-id': '1' } },
  );

  expect(response.status()).toBe(200);

  const recipientSchema = Joi.object({
    id: Joi.number(),
    uei: Joi.allow(null),
    name: Joi.string(),
    recipientType: Joi.allow(null),
    createdAt: Joi.date(),
    updatedAt: Joi.date(),
    deleted: Joi.any().allow(null),
  });

  const grantSchema = Joi.object({
    goalId: Joi.number(),
    programTypes: Joi.array(),
    name: Joi.string(),
    numberWithProgramTypes: Joi.string(),
    recipientInfo: Joi.string(),
    id: Joi.number(),
    number: Joi.string(),
    annualFundingMonth: Joi.allow(null),
    cdi: Joi.boolean(),
    status: Joi.string(),
    grantSpecialistName: Joi.allow(null),
    grantSpecialistEmail: Joi.allow(null),
    programSpecialistName: Joi.allow(null),
    programSpecialistEmail: Joi.allow(null),
    stateCode: Joi.allow(null),
    startDate: Joi.allow(null),
    endDate: Joi.allow(null),
    recipientId: Joi.number(),
    granteeName: Joi.string().allow(null),
    oldGrantId: Joi.allow(null),
    createdAt: Joi.date(),
    updatedAt: Joi.date(),
    regionId: Joi.number(),
    recipient: recipientSchema,
    inactivationDate: Joi.any().allow(null),
    inactivationReason: Joi.any().allow(null),
    deleted: Joi.any().allow(null),
    recipientNameWithPrograms: Joi.string(),
    geographicRegionId: Joi.number().allow(null),
    geographicRegion: Joi.string().allow(null),
  });

  const schema = Joi.array().items(Joi.object({
    endDate: Joi.string().allow(null).allow(''),
    status: Joi.string(),
    value: Joi.number(),
    label: Joi.string(),
    id: Joi.number(),
    name: Joi.string(),
    grant: grantSchema,
    objectives: Joi.array(),
    goalNumber: Joi.string(),
    goalNumbers: Joi.array().items(Joi.string()),
    goalIds: Joi.array().items(Joi.number()),
    grants: Joi.array().items(grantSchema),
    grantId: Joi.number(),
    grantIds: Joi.array().items(Joi.number()),
    isNew: Joi.boolean(),
    collaborators: Joi.array().items(Joi.any().allow(null)),
    prompts: Joi.object(),
    promptsForReview: Joi.array().items(Joi.object({
      key: Joi.string(),
      recipients: Joi.array().items(Joi.object({
        id: Joi.number(),
        name: Joi.string(),
      })),
      responses: Joi.array().items(Joi.string()),
    })),
    source: Joi.any(),
    onApprovedAR: Joi.boolean(),
    isSourceEditable: Joi.boolean(),
    statusChanges: Joi.array().items(Joi.object({
      oldStatus: Joi.string(),
      newStatus: Joi.string(),
    })),
    isReopenedGoal: Joi.boolean(),
    regionId: Joi.number(),
    recipientId: Joi.number(),
  }));

  await validateSchema(response, schema, expect);
});

test('put /goals/changeStatus', async ({ request }) => {
  const response = await request.put(
    `${root}/goals/changeStatus`,
    {
      data: {
        goalIds: [3],
        oldStatus: GOAL_STATUS.NOT_STARTED,
        newStatus: GOAL_STATUS.CLOSED,
        closeSuspendReason: CLOSE_SUSPEND_REASONS[0],
        closeSuspendContext: 'Just because',
      },
      headers: { 'playwright-user-id': '1' }
    },
  );

  expect(response.status()).toBe(200);
});

test('post /', async ({ request }) => {
  const response = await request.post(
    `${root}/goals`,
    {
      data: {
        goals: [
          {
            name: 'New Goal',
            recipientId: 1,
            grantId: 1,
            regionId: 14,
            status: GOAL_STATUS.NOT_STARTED,
            endDate: '2021-12-31',
            objectives: [
              {
                id: 'new-999',
                resources: [],
                topics: [],
                title: 'New objective',
                files: [],
                status: OBJECTIVE_STATUS.DRAFT,
                ttaProvided: "",
                isNew: true,
                supportType: null,
              }
            ],
            goalNumbers: [],
            goalIds: [],
            grants: [],
            grantIds: [],
            isNew: true,
          },
        ],
      },
      headers: { 'playwright-user-id': '1' }
    },
  );

  expect(response.status()).toBe(200);
});

// ----------------------------------------
// This test is commented out because it somehow conflicts with the
// e2e tests. Until I can think of a way to make this test more
// resilient, I'm going to leave it commented out.
// ----------------------------------------
// test('delete /', async ({ request }) => {
//   let validId = 5;
//
//   // So this test fails when it's run too quickly after the previous /post
//   // because it hasn't finished committing the new goal to the
//   // database?
//   await new Promise((res) => setTimeout(res, 1000));
//
//   // This is an attempt to ensure these tests can be run locally
//   // without having to drop and reseed the database between each run.
//   // It shouldn't ever run infinitely because if we made it to this test,
//   // it means we actually created a goal in the previous test, so there *should*
//   // be something to find.
//   while(true) {
//     const response = await request.get(
//       `${root}/goals/${validId}/recipient/11`,
//       { headers: { 'playwright-user-id': '1' } },
//     );
//
//     if (response.status() === 200) {
//       break;
//     }
//
//     validId++;
//
//     // Okay, maybe just reseed your local database at this point.
//     if (validId > 100) {
//       throw new Error('Could not find goal id to delete');
//     }
//   }
//
//   const response = await request.delete(
//     `${root}/goals?goalIds[]=${validId}`,
//     { headers: { 'playwright-user-id': '1' } },
//   );
//
//   expect(response.status()).toBe(200);
// });
