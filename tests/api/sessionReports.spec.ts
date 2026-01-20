import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

test('get /session-reports', async ({ request }) => {
  const response = await request.get(
    `${root}/session-reports`,
    { headers: { 'playwright-user-id': '1' } },
  );

  expect(response.status()).toBe(200);

  const sessionReportRowSchema = Joi.object({
    id: Joi.number(),
    eventId: Joi.string().allow(null),
    eventName: Joi.string().allow(null),
    sessionName: Joi.string().allow(null),
    startDate: Joi.string().allow(null),
    endDate: Joi.string().allow(null),
    objectiveTopics: Joi.array().items(Joi.string()).allow(null),
  });

  const schema = Joi.object({
    count: Joi.number(),
    rows: Joi.array().items(sessionReportRowSchema),
  });

  await validateSchema(response, schema, expect);
});
