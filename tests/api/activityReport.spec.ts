import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

test.describe('get /activity-reports/goals', () => {
  test('200', async ({ request }) => {
    const response = await request.get(`${root}/activity-reports/goals?grantIds=1`,  { headers: { 'playwright-user-id': '1' } });
    const goalForGrant = Joi.object({
      grantIds: Joi.array().items(Joi.number()).required(),
      goalIds: Joi.array().items(Joi.number()).required(),
      oldGrantIds: Joi.array().items(Joi.any()).required(),
      created: Joi.any().required(),
      goalTemplateId: Joi.number().required(),
      name: Joi.string().required(),
      status: Joi.string().required(),
      onApprovedAR: Joi.boolean().required(),
      endDate: Joi.any().required(),
      source: Joi.any(),
      isCurated: Joi.boolean().required(),
      createdVia: Joi.any(),
    });
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(goalForGrant);

    await validateSchema(response, schema, expect);
  });
});

