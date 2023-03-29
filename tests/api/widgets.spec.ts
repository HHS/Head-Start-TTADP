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

  });

  test('totalHrsAndRecipientGraph', async ({ request }) => {

  });

  test('reasonList', async ({ request }) => {

  });

  test('topicFrequencyGraph', async ({ request }) => {

  });

  test('targetPopulationTable', async ({ request }) => {

  });

  test('frequencyGraph', async ({ request }) => {

  });

  test('goalStatusByGoalName', async ({ request }) => {

  });

  test('goalsByStatus', async ({ request }) => {

  });

  test('goalsPercentage', async ({ request }) => {

  });

  test('topicsByGoalStatus', async ({ request }) => {

  });

});