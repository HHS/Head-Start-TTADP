import { test, expect } from '@playwright/test';
import Joi from 'joi';
import { root, validateSchema } from './common';

test('get /goals?goalIds[]=&reportId', async ({ request }) => {
  const response = await request.get(
    `${root}/goals?goalIds[]=4&reportId=10000`,
    { headers: { 'playwright-user-id': '1' } },
  );

  expect(response.status()).toBe(200);

  const recipientSchema = Joi.object({
    id: Joi.number(),
    uei: Joi.allow(null),
    name: Joi.string(),
    recipientType: Joi.allow(null),
    createdAt: Joi.date(),
    updatedAt: Joi.date()
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
    oldGrantId: Joi.allow(null),
    createdAt: Joi.date(),
    updatedAt: Joi.date(),
    regionId: Joi.number(),
    recipient: recipientSchema
  });
  
  const schema = Joi.array().items(Joi.object({
    endDate: Joi.date().allow(null),
    status: Joi.string(),
    value: Joi.number(),
    label: Joi.string(),
    id: Joi.number(),
    name: Joi.string(),
    grant: grantSchema,
    objectives: Joi.array(),
    goalNumbers: Joi.array().items(Joi.string()),
    goalIds: Joi.array().items(Joi.number()),
    grants: Joi.array().items(grantSchema),
    grantIds: Joi.array().items(Joi.number()),
    isNew: Joi.boolean()
  }));

  await validateSchema(response, schema, expect);

});