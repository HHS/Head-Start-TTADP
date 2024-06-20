/* eslint-disable max-len */
import request from 'supertest';
import faker from '@faker-js/faker';
import app from './app';
import { createRecipient, createGrants } from './testUtils';
import {
  sequelize,
  Grant,
  ActivityRecipient,
  ActivityReport,
  Topic,
} from './models';
import { GOAL_STATUS, OBJECTIVE_STATUS } from './constants';

jest.mock('axios');
jest.mock('smartsheet');

describe('Smash the site with a giant report', () => {
  let recipient;
  let grants;
  let topic;

  const BASE_REPORT = {
    activityRecipientType: 'recipient',
    regionId: 1,
  };

  const BASE_GOAL = {
    ids: [],
    status: GOAL_STATUS.DRAFT,
    createdVia: 'activityReport',
    source: '',
  };

  const BASE_OBJECTIVE = {
    supportType: 'Maintaining',
    closeSuspendContext: '',
    closeSuspendReason: '',
    files: [],
    objectiveCreatedHere: true,
    status: OBJECTIVE_STATUS.NOT_STARTED,
    ttaProvided: '<p>Yes</p>',
  };

  beforeAll(async () => {
    recipient = await createRecipient();
    grants = await createGrants({ recipientId: recipient.id }, 30);
    topic = await Topic.create({ name: faker.datatype.string(100) });
  });

  afterAll(async () => {
    const grantIds = grants.map((grant) => grant.id);

    const recipientJoins = await ActivityRecipient.findAll({ where: { grantId: grantIds } });
    await ActivityReport.destroy(
      {
        where: { id: recipientJoins.map((join) => join.activityReportId) },
        individualHooks: true,
      },
    );

    await Grant.destroy({ where: { id: grantIds }, individualHooks: true });
    await Topic.destroy({ where: { id: topic.id }, individualHooks: true });
    // Clean up the database
    await recipient.destroy({ individualHooks: true });
    await sequelize.close();
  });

  test('Handles getting smashed by a big report', async () => {
    const { status, body } = await request(app)
      .post('/api/activity-reports')
      .send({
        ...BASE_REPORT,
        activityRecipients: grants.map((grant) => ({
          activityRecipientId: grant.id,
        })),
      });

    const reportId = body.id;
    expect(status).toBe(200);

    const goals = [{
      ...BASE_GOAL,
      name: faker.datatype.string(100),
      objectives: [{
        ...BASE_OBJECTIVE,
        title: faker.datatype.string(100),
        topics: [{ id: topic.id }],
        resources: [{ url: faker.internet.url() }],
      }],
    }, {
      ...BASE_GOAL,
      name: faker.datatype.string(100),
      objectives: [{
        ...BASE_OBJECTIVE,
        title: faker.datatype.string(100),
        topics: [{ id: topic.id }],
        resources: [{ url: faker.internet.url() }],
      }],
    }];

    const { status: status2, body: body2 } = await request(app)
      .post(`/api/activity-reports/${reportId}`)
      .send({
        ...BASE_REPORT,
        id: reportId,
        activityRecipients: grants.map((grant) => ({
          activityRecipientId: grant.id,
        })),
        goals,
      });

    console.log(body2);

    expect(status2).toBe(200);
  });
});

/**
 * yarn docker:yarn:be node 'node_modules/.bin/jest' 'src/index.bigReport.test.js' -t 'Smash the site with a giant report' ---forceExit
 */
