import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

test.describe('get /role', () => {

  test('/', async ({ request }) => {
    const response = await request.get(`${root}/role`);

    const specialistSchema = Joi.object({
      id: Joi.number().required(),
      name: Joi.string().required(),
      fullName: Joi.string().required(),
      isSpecialist: Joi.boolean().required(),
      deletedAt: Joi.date().allow(null).required(),
      mapsTo: Joi.string().allow(null).required(),
      createdAt: Joi.date().required(),
      updatedAt: Joi.date().required(),
    });
    
    const schema = Joi.array().items(specialistSchema).min(1);    expect(response.status()).toBe(200);

    await validateSchema(response, schema, expect);
  });

  test('/specialists', async ({ request }) => {
    const response = await request.get(`${root}/role/specialists`);

    const specialistSchema = Joi.object({
      id: Joi.number().required(),
      name: Joi.string().required(),
      fullName: Joi.string().required(),
      isSpecialist: Joi.boolean().required(),
      deletedAt: Joi.any().allow(null),
      mapsTo: Joi.any().allow(null),
      createdAt: Joi.date().required(),
      updatedAt: Joi.date().required(),
    });
    
    const schema = Joi.array().items(specialistSchema);

    await validateSchema(response, schema, expect);
  });

});