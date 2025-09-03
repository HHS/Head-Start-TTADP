import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

enum SortBy {
  Name = 'name',
  RegionID = 'regionId',
  ProgramSpecialist = 'programSpecialist',
  grantSpecialist = 'grantSpecialist',
}

enum Direction {
  Asc = 'asc',
  Desc = 'desc',
}

test.describe('get /recipient', () => {

  const searchSchema = Joi.object({
    count: Joi.number().required(),
    rows: Joi.array().items(Joi.object({
      count: Joi.string().required(),
      programSpecialists: Joi.any().allow(null),
      grantSpecialists: Joi.any().allow(null),
      regionId: Joi.number().required(),
      id: Joi.number().required(),
      name: Joi.string().required(),
      deleted: Joi.boolean().allow(null),
      recipientType: Joi.any().allow(null)
    })).required()
  });

  test('/search, matches', async ({ request }) => {
    const response = await request.get(
      `${root}/recipient/search?s=4444&sortBy=${SortBy.Name}&direction=${Direction.Asc}&offset=0`
    );
    expect(response.status()).toBe(200);


    await validateSchema(response, searchSchema, expect);

    // count should specifically be '1' for cucumber user:
    const body = await response.body();
    const json = JSON.parse(String(body));
    expect(json.count).toBe(1);
    expect(json.rows[0].name).toBe('Agency 1.a in region 1, Inc.');
  });

  test('/search, no matches', async ({ request }) => {
    const response = await request.get(
      `${root}/recipient/search?s=4444&sortBy=${SortBy.Name}&direction=${Direction.Asc}&offset=0`,
      { headers: { 'playwright-user-id': '4' } }, // ron weasley, region 3, no match to '4444'
    );
    expect(response.status()).toBe(200);

    await validateSchema(response, searchSchema, expect);

    // count should specifically be '0' for ron weasley:
    const body = await response.body();
    const json = JSON.parse(String(body));
    expect(json.count).toBe(0);
  });

  test('/user', async ({ request }) => {
    const response = await request.get(`${root}/recipient/user`);
    const grantSchema = Joi.object({
      programTypes: Joi.array().items(Joi.string()),
      name: Joi.string(),
      numberWithProgramTypes: Joi.string(),
      recipientInfo: Joi.string(),
      id: Joi.number().integer().positive(),
      number: Joi.string(),
      annualFundingMonth: Joi.any().allow(null),
      cdi: Joi.boolean(),
      status: Joi.string(),
      grantSpecialistName: Joi.any().allow(null),
      granteeName: Joi.any().allow(null),
      grantSpecialistEmail: Joi.any().allow(null),
      programSpecialistName: Joi.any().allow(null),
      programSpecialistEmail: Joi.any().allow(null),
      stateCode: Joi.any().allow(null),
      startDate: Joi.any().allow(null),
      endDate: Joi.any().allow(null),
      recipientId: Joi.number().integer().positive(),
      oldGrantId: Joi.any().allow(null),
      createdAt: Joi.string().isoDate(),
      updatedAt: Joi.string().isoDate(),
      regionId: Joi.number().integer().positive(),
      deleted: Joi.boolean().allow(null),
      inactivationDate: Joi.any().allow(null),
      inactivationReason: Joi.any().allow(null),
      recipientNameWithPrograms: Joi.string(),
      recipient: Joi.object({
        id: Joi.number().integer().positive(),
        uei: Joi.any().allow(null),
        name: Joi.string(),
        deleted: Joi.boolean().allow(null),
        recipientType: Joi.any().allow(null),
        createdAt: Joi.string().isoDate(),
        updatedAt: Joi.string().isoDate(),
      }),
      geographicRegionId: Joi.number().allow(null),
      geographicRegion: Joi.string().allow(null),
    });

    const recipientSchema = Joi.object({
      id: Joi.number().integer().positive(),
      uei: Joi.any().allow(null),
      name: Joi.string(),
      recipientType: Joi.any().allow(null),
      createdAt: Joi.string().isoDate(),
      updatedAt: Joi.string().isoDate(),
      deleted: Joi.boolean().allow(null),
      grants: Joi.array().items(grantSchema),
    });

    const schema = Joi.array().items(recipientSchema).min(1);

    await validateSchema(response, schema, expect);
  });

  test('/:recipientId, unauthorized', async ({ request }) => {
    const response = await request.get(`${root}/recipient/2`);
    expect(response.status()).toBe(401);
  });

  test(':recipientId, authorized', async ({ request }) => {
    const response = await request.get(`${root}/recipient/2`, { headers: { 'playwright-user-id': '1' } });
    expect(response.status()).toBe(200);

    const grantSchema = Joi.object({
      numberWithProgramTypes: Joi.string(),
      id: Joi.number().integer().required(),
      number: Joi.string().required(),
      regionId: Joi.number().integer(),
      status: Joi.string().valid("Active", "Inactive"),
      startDate: Joi.date().allow(null),
      endDate: Joi.date().allow(null),
      programSpecialistName: Joi.string().allow(null),
      grantSpecialistName: Joi.string().allow(null),
      recipientId: Joi.number().integer(),
      annualFundingMonth: Joi.string().allow(null),
      programs: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          programType: Joi.string().required(),
        })
      ),
    });

    const grantMissingStandardSchema = Joi.object({
      goalTemplateId: Joi.number().allow(null),
      templateName: Joi.string().allow(null),
      grantId: Joi.number().allow(null),
    });

    const schema = Joi.object({
      id: Joi.number().integer().required(),
      name: Joi.string().required(),
      recipientType: Joi.string().allow(null),
      uei: Joi.string().allow(null),
      grants: Joi.array().items(grantSchema),
      missingStandardGoals: Joi.array().items(grantMissingStandardSchema),
    });

    await validateSchema(response, schema, expect);
  });

  test('/:recipientId/region/:regionId/goals', async ({ request }) => {
    const response = await request.get(`${root}/recipient/2/region/14/goals`, { headers: { 'playwright-user-id': '1' } });
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      count: Joi.number().required(),
      goalRows: Joi.array().items(Joi.object()).required(),
      statuses: Joi.object({
        total: Joi.number().required(),
        'Not started': Joi.number().required(),
        'In progress': Joi.number().required(),
        'Suspended': Joi.number().required(),
        'Closed': Joi.number().required()
      }).required(),
      allGoalIds: Joi.array().items(Joi.string()).required()
    });

    await validateSchema(response, schema, expect);
  });

  test('/:recipientId/goals', async ({ request }) => {
    const response = await request.get(`${root}/recipient/2/goals?goalIds[]=4`, { headers: { 'playwright-user-id': '1' } });
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(
      Joi.object({
        id: Joi.number(),
        isCurated: Joi.boolean(),
        isSourceEditable: Joi.boolean(),
        prompts: Joi.object(),
        promptsForReview: Joi.array().items(Joi.object({
          key: Joi.string(),
          recipients: Joi.array().items(Joi.object({
            id: Joi.number(),
            name: Joi.string(),
          })),
          responses: Joi.array().items(Joi.string()),
        })),
        name: Joi.string(),
        source: Joi.object(),
        goalTemplateId: Joi.number().allow(null),
        status: Joi.string(),
        regionId: Joi.number(),
        recipientId: Joi.number(),
        createdVia: Joi.any().allow(null),
        isRttapa: Joi.any().allow(null),
        onAR: Joi.boolean(),
        onApprovedAR: Joi.boolean(),
        rtrOrder: Joi.number(),
        objectives: Joi.array().items(),
        grant: Joi.object({
          numberWithProgramTypes: Joi.string(),
          id: Joi.number(),
          number: Joi.string(),
          regionId: Joi.number(),
          recipientId: Joi.number(),
          recipient: Joi.object({
            id: Joi.number(),
            name: Joi.string(),
          }),
          programs: Joi.array().items(
            Joi.object({
              programType: Joi.string()
            })
          )
        }),
        goalNumber: Joi.string(),
        goalNumbers: Joi.array().items(Joi.string()),
        goalIds: Joi.array().items(Joi.number()),
        grantId: Joi.number(),
        grants: Joi.array().items(
          Joi.object({
            id: Joi.number(),
            number: Joi.string(),
            regionId: Joi.number(),
            recipientId: Joi.number(),
            recipient: Joi.object({
              id: Joi.number(),
              name: Joi.string(),
            }),
            programs: Joi.array().items(
              Joi.object({
                programType: Joi.string()
              })
            ),
            numberWithProgramTypes: Joi.string(),
            name: Joi.string(),
            goalId: Joi.number()
          })
        ),
        grantIds: Joi.array().items(Joi.number()),
        isNew: Joi.boolean(),
        endDate: Joi.string().allow(null).allow(''),
        goalCollaborators: Joi.array().items(Joi.any().allow(null)),
        collaborators: Joi.array().items(Joi.any().allow(null)),
        statusChanges: Joi.array().items(Joi.object({
          oldStatus: Joi.string(),
          newStatus: Joi.string(),
        })),
        isReopenedGoal: Joi.boolean(),
      })
    ).min(1);

    await validateSchema(response, schema, expect);
  });

});
