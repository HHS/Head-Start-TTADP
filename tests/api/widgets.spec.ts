import { test, expect } from '@playwright/test';
import Joi from 'joi';
import { reseed } from '../utils/common';
import { root, validateSchema } from './common';

test.beforeAll(async ({ request }) => {
  console.log("Reseeding before widget tests.");
  await reseed(request);
  console.log("Finished reseeding before widget tests.");
});

test.describe('widgets', () => {

  test('overview', async ({ request }) => {
    console.log("widgets > overview beginning");
    const response = await request.get(`${root}/widgets/overview`);
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      numReports: Joi.string().required(),
      numGrants: Joi.string().required(),
      numOtherEntities: Joi.string().required(),
      recipientPercentage: Joi.string().regex(/^\d{1,3}\.\d{1,2}%$/).required(),
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
      recipientPercentage: Joi.string().regex(/^\d{1,3}\.\d{1,2}%$/).required(),
      numRecipients: Joi.string().required(),
      totalRecipients: Joi.string().required(),
      inPerson: Joi.string().required(),
      sumDuration: Joi.string().required(),
      numParticipants: Joi.string().required()
    });

    await validateSchema(response, schema, expect);
  });

  test('monitoringOverview', async ({ request }) => {
    const response = await request.get(`${root}/widgets/monitoringOverview`);
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      percentCompliantFollowUpReviewsWithTtaSupport: Joi.string().required(),
      totalCompliantFollowUpReviewsWithTtaSupport: Joi.string().required(),
      totalCompliantFollowUpReviews: Joi.string().required(),
      percentActiveDeficientCitationsWithTtaSupport: Joi.string().required(),
      totalActiveDeficientCitationsWithTtaSupport: Joi.string().required(),
      totalActiveDeficientCitations: Joi.string().required(),
      percentActiveNoncompliantCitationsWithTtaSupport: Joi.string().required(),
      totalActiveNoncompliantCitationsWithTtaSupport: Joi.string().required(),
      totalActiveNoncompliantCitations: Joi.string().required(),
    });

    await validateSchema(response, schema, expect);
  });

  test('reportCountByFindingCategory', async ({ request }) => {
    const response = await request.get(`${root}/widgets/reportCountByFindingCategory`);
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        months: Joi.array().items(Joi.string()).required(),
        counts: Joi.array().items(Joi.number().integer()).required(),
      })
    );

    await validateSchema(response, schema, expect);

    const body = await response.json() as { name: string; months: string[]; counts: number[] }[];
    body.forEach((item) => {
      expect(item.months.length).toBe(item.counts.length);
    });
  });

  test('totalHrsAndRecipientGraph', async ({ request }) => {
    const response = await request.get(`${root}/widgets/totalHrsAndRecipientGraph`);
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        id: Joi.string().required(),
        trace: Joi.string().required(),
        x: Joi.array().items(Joi.string()).required(),
        y: Joi.array().items(Joi.number()).required(),
        month: Joi.array().items(Joi.boolean()).required()
      })
    );

    await validateSchema(response, schema, expect);
  });

  test('standardGoalsList', async ({ request }) => {
    const response = await request.get(`${root}/widgets/standardGoalsList`);
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

    const schema = Joi.object({
      topics: Joi.array().items(topicSchema).required()
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

});
