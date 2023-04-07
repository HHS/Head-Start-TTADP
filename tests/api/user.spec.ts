import { test, expect } from '@playwright/test';
import Joi from 'joi';
import { root, validateSchema } from './common';

test('get /user', async ({ request }) => {
  const response = await request.get(
    `${root}/user`,
    { headers: { 'playwright-user-id': '1' } },
  );
  const body = await response.body();

  const schema = Joi.object({
    id: Joi.number().required(),
    name: Joi.string().required(),
    hsesUserId: Joi.string().required(),
    hsesUsername: Joi.string().required(),
    hsesAuthorities: Joi.any().allow(null),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().required(),
    homeRegionId: Joi.number().required(),
    lastLogin: Joi.date().iso().required(),
    flags: Joi.alternatives().try(
      Joi.array().items(Joi.any()),
      Joi.string()
    ).required(),
    createdAt: Joi.date().iso().required(),
    permissions: Joi.array().items(
      Joi.object({
        userId: Joi.number().required(),
        scopeId: Joi.number().required(),
        regionId: Joi.number().required(),
      })
    ).required(),
    roles: Joi.array().items(
      Joi.object({
        id: Joi.number().required(),
        name: Joi.string().required(),
        fullName: Joi.string().required(),
        isSpecialist: Joi.boolean().required(),
        deletedAt: Joi.any().allow(null),
        mapsTo: Joi.any().allow(null),
        createdAt: Joi.date().iso().required(),
        updatedAt: Joi.date().iso().required(),
        UserRole: Joi.object().required(),
      })
    ).required(),
    validationStatus: Joi.array().items(Joi.any()).required(),
  });

  await validateSchema(response, schema, expect);
});