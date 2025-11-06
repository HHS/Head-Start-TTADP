import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

test('get /v1/activity-reports/display/R01-AR-9999', async ({ request }) => {
  const response = await request.get(
    `${root}/v1/activity-reports/display/R01-AR-9999`,
  );

  expect(response.status()).toBe(200);
  const schema = Joi.object({
    data: Joi.object({
      id: Joi.string().required(),
      type: Joi.string().required(),
      attributes: Joi.object({
        author: Joi.object({
          id: Joi.string().required(),
          name: Joi.string().required(),
        }).required(),
        collaborators: Joi.array().items(Joi.any()).default([]),
        displayId: Joi.string().required(),
        duration: Joi.number().required(),
        endDate: Joi.string().isoDate().required(),
        region: Joi.number().required(),
        reportCreationDate: Joi.string().isoDate().required(),
        reportLastUpdated: Joi.string().isoDate().required(),
        startDate: Joi.string().isoDate().required(),
        topics: Joi.array().items(Joi.string()).required(),
      }).required(),
      links: Joi.object({
        self: Joi.string().required(),
        html: Joi.string().required(),
      }).required(),
    }).required(),
  });

  await validateSchema(response, schema, expect);
});