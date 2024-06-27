/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
import request from 'supertest';
import faker from '@faker-js/faker';
import app from './app';
import { createRecipient, createGrants } from './testUtils';
import {
  sequelize,
  Topic,
} from './models';
import { GOAL_STATUS, OBJECTIVE_STATUS } from './constants';
// import { captureSnapshot, rollbackToSnapshot } from './lib/programmaticTransaction';
import { activityReportAndRecipientsById } from './services/activityReports';

jest.mock('smartsheet');

const BIG_TIMEOUT = 240000;
const fakeUrl = () => `${faker.internet.url()}/${faker.datatype.string(100)}`;

describe('Smash the site with a giant report', () => {
  // let snapshot;

  const BASE_REPORT = {
    activityRecipientType: 'recipient',
    regionId: 1,
    context: `context ${fakeUrl()}`,
    pageState: {
      1: 'In progress', 2: 'Not started', 3: 'Not started', 4: 'Not started',
    },
    version: 2,
    ECLKCResourcesUsed: [],
    activityType: [],
    additionalNotes: null,
    files: [],
    collaborators: [],
    activityReportCollaborators: [],
    deliveryMethod: null,
    duration: null,
    goals: [],
    recipientNextSteps: [{ id: null, note: '' }],
    recipients: [],
    nonECLKCResourcesUsed: [],
    numberOfParticipants: null,
    objectivesWithoutGoals: [],
    otherResources: [],
    participantCategory: '',
    participants: [],
    reason: [],
    requester: null,
    specialistNextSteps: [{ id: null, note: '' }],
    calculatedStatus: 'draft',
    targetPopulations: [],
    topics: [],
    approvers: [],
    creatorRole: 'Grants Specialist',
    userId: 5,
    savedToStorageTime: new Date(),
    createdInLocalStorage: new Date(),
    ttaType: [],
    startDate: null,
    endDate: null,
    approverUserIds: [],
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
    ttaProvided: `<p>Yes</p> ${faker.datatype.string(100)} ${fakeUrl()}`,
  };

  beforeAll(async () => {
    jest.setTimeout(BIG_TIMEOUT);
    // snapshot = await captureSnapshot();
  }, BIG_TIMEOUT);

  afterAll(async () => {
    // await rollbackToSnapshot(snapshot);
    await sequelize.close();
  }, BIG_TIMEOUT);

  test('Handles getting smashed by a big report', async () => {
    const topic1 = await Topic.create({ name: faker.datatype.string(100) });
    const topic2 = await Topic.create({ name: faker.datatype.string(100) });
    const recipient = await createRecipient();
    const grants = await createGrants({ recipientId: recipient.id, regionId: 1 }, 30);
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
      grantIds: grants.map((grant) => grant.id),
      name: faker.datatype.string(100),
      objectives: [{
        ...BASE_OBJECTIVE,
        title: faker.datatype.string(100),
        topics: [{ id: topic1.id }, { id: topic2.id }],
        resources: [{ url: fakeUrl() }],
      }],
    }, {
      ...BASE_GOAL,
      grantIds: grants.map((grant) => grant.id),
      name: faker.datatype.string(100),
      objectives: [{
        ...BASE_OBJECTIVE,
        title: faker.datatype.string(100),
        topics: [{ id: topic1.id }, { id: topic2.id }],
        resources: [
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
        ],
      }],
    }, {
      ...BASE_GOAL,
      grantIds: grants.map((grant) => grant.id),
      name: faker.datatype.string(100),
      objectives: [{
        ...BASE_OBJECTIVE,
        title: faker.datatype.string(100),
        topics: [{ id: topic1.id }, { id: topic2.id }],
        resources: [
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
          { url: fakeUrl() },
        ],
      }],
    }];

    const [report] = await activityReportAndRecipientsById(reportId);
    expect(report).toBeDefined();
    expect(report.id).toEqual(reportId);

    const url = `/api/activity-reports/${reportId}`;
    const { status: status2 } = await request(app)
      .put(url)
      .send({
        ...BASE_REPORT,
        id: reportId,
        activityRecipients: grants.map((grant) => ({
          activityRecipientId: grant.id,
        })),
        goals,
      });

    expect(status2).toBe(200);
    const { status: status3 } = await request(app)
      .put(url)
      .send({
        ...BASE_REPORT,
        id: reportId,
        activityRecipients: grants.map((grant) => ({
          activityRecipientId: grant.id,
        })),
        goals: [goals[0]],
      });

    expect(status3).toBe(200);

    const { status: status4 } = await request(app)
      .put(url)
      .send({
        ...BASE_REPORT,
        id: reportId,
        activityRecipients: grants.map((grant) => ({
          activityRecipientId: grant.id,
        })),
        goals,
      });

    expect(status4).toBe(200);
  });
}, BIG_TIMEOUT);

/**
 * yarn docker:yarn:be node 'node_modules/.bin/jest' 'src/index.bigReport.test.js' ---forceExit
 */
