import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

test('get /topic', async ({ request }) => {
  const response = await request.get(`${root}/topic`);
  expect(response.status()).toBe(200);

  const schema = Joi.array().items(
    Joi.object({
      id: Joi.number().integer().required(),
      name: Joi.string().required()
    })
  ).min(1);

  await validateSchema(response, schema, expect);
});
