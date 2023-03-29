import { test, expect } from '@playwright/test';
import Joi from 'joi';
import { root, validateSchema } from './common';

test.describe('get /widgets/:widgetId', () => {

  test('overview', async ({ request }) => {
    const response = await request.get(`${root}/widgets/overview`);
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      numReports: Joi.string().required(),
      numGrants: Joi.string().required(),
      numOtherEntities: Joi.string().required(),
      recipientPercentage: Joi.string().regex(/^\d{1,2}\.\d{1,2}%$/).required(),
      numRecipients: Joi.string().required(),
      totalRecipients: Joi.string().required(),
      inPerson: Joi.string().required(),
      sumDuration: Joi.string().required(),
      numParticipants: Joi.string().required()
    });

    await validateSchema(response, schema, expect);
  });

  test('dashboardOverview', async ({ request }) => {
    const response = await request.get(`${root}/widgets/dashboardOverview`);
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      numReports: Joi.string().required(),
      numGrants: Joi.string().required(),
      numOtherEntities: Joi.string().required(),
      recipientPercentage: Joi.string().regex(/^\d{1,2}\.\d{1,2}%$/).required(),
      numRecipients: Joi.string().required(),
      totalRecipients: Joi.string().required(),
      inPerson: Joi.string().required(),
      sumDuration: Joi.string().required(),
      numParticipants: Joi.string().required()
    });

    await validateSchema(response, schema, expect);
  });

  test('totalHrsAndRecipientGraph', async ({ request }) => {
    const response = await request.get(`${root}/widgets/totalHrsAndRecipientGraph`);
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        x: Joi.array().items(Joi.string()).required(),
        y: Joi.array().items(Joi.number()).required(),
        month: Joi.array().items(Joi.boolean()).required()
      })
    );

    await validateSchema(response, schema, expect);
  });

  test('reasonList', async ({ request }) => {
    const response = await request.get(`${root}/widgets/reasonList`);
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        count: Joi.number().integer().required()
      })
    );

    await validateSchema(response, schema, expect);
  });

  test('topicFrequencyGraph', async ({ request }) => {
    const response = await request.get(`${root}/widgets/topicFrequencyGraph`);
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(
      Joi.object({
        topic: Joi.string().required(),
        count: Joi.number().integer().required()
      })
    );

    await validateSchema(response, schema, expect);
  });

  test('targetPopulationTable', async ({ request }) => {
    const response = await request.get(`${root}/widgets/targetPopulationTable`);
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        count: Joi.number().integer().required()
      })
    );

    await validateSchema(response, schema, expect);
  });

  test('frequencyGraph', async ({ request }) => {
    const response = await request.get(`${root}/widgets/frequencyGraph`);
    expect(response.status()).toBe(200);

    const topicSchema = Joi.object({
      category: Joi.string().required(),
      count: Joi.number().integer().required()
    });
    
    const reasonsSchema = Joi.object({
      category: Joi.string().required(),
      count: Joi.number().integer().required()
    });
    
    const schema = Joi.object({
      topics: Joi.array().items(topicSchema).required(),
      reasons: Joi.array().items(reasonsSchema).required()
    });

    await validateSchema(response, schema, expect);
  });

  test('goalStatusByGoalName', async ({ request }) => {
    const response = await request.get(`${root}/widgets/goalStatusByGoalName`);
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      total: Joi.number().integer().required(),
      'Not started': Joi.number().integer().required(),
      'In progress': Joi.number().integer().required(),
      Suspended: Joi.number().integer().required(),
      Closed: Joi.number().integer().required()
    });

    await validateSchema(response, schema, expect);
  });

  test('goalsByStatus', async ({ request }) => {
    const response = await request.get(`${root}/widgets/goalsByStatus`);
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      total: Joi.number().integer().required(),
      'Not started': Joi.number().integer().required(),
      'In progress': Joi.number().integer().required(),
      Suspended: Joi.number().integer().required(),
      Closed: Joi.number().integer().required(),
      Draft: Joi.number().integer().required()
    });

    await validateSchema(response, schema, expect);
  });

  test('goalsPercentage', async ({ request }) => {
    const response = await request.get(`${root}/widgets/goalsPercentage`);
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      numerator: Joi.number().integer().required(),
      denominator: Joi.number().integer().required(),
      percentage: Joi.number().allow(null).required()
    });

    await validateSchema(response, schema, expect);
  });

  test('topicsByGoalStatus', async ({ request }) => {
    const response = await request.get(`${root}/widgets/topicsByGoalStatus`);
    expect(response.status()).toBe(200);

    const schema = Joi.array().items().required().min(0);

    await validateSchema(response, schema, expect);
  });

});