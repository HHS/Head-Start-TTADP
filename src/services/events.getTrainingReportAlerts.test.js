/* eslint-disable max-len */
import faker from '@faker-js/faker';
import {
  TRAINING_REPORT_STATUSES,
} from '@ttahub/common';
import {
  EventReportPilot,
  SessionReportPilot,
  sequelize,
} from '../models';
import {
  getTrainingReportAlerts,
} from './event';
import * as transactionModule from '../lib/programmaticTransaction';

jest.mock('bull');

const regionId = 1;

async function createEvents({
  ownerId = faker.datatype.number(),
  collaboratorId = faker.datatype.number(),
  pocId = faker.datatype.number(),
}) {
  // create some events!!!
  const baseEvent = {
    ownerId,
    collaboratorIds: [collaboratorId],
    pocIds: [pocId],
    regionId: 1,
    data: {
      eventName: faker.datatype.string(),
      eventId: `R0${regionId}-TR-${faker.datatype.number(4)}`,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      trainingType: 'Series',
      targetPopulations: ['Children & Families'],
      reasons: ['Coaching'],
      vision: 'Testing!',
      eventSubmitted: false,
    },
  };

  const testData = {
    ids: [],
    ist: {
      missingEventInfo: [],
      missingSessionInfo: [],
      noSessionsCreated: [],
      eventNotCompleted: [],
    },
    poc: {
      missingSessionInfo: [],
    },
  };

  // event that has no start date (will not appear in alerts)
  const minus2 = await EventReportPilot.create(baseEvent);
  testData.ids.push(minus2.id);

  // event with no sessions and a start date of today (Will not appear in alerts)
  const minus1 = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(),
    },
  });

  testData.ids.push(minus1.id);

  // event with no sessions and a start date of one month ago (Will appear in alerts)
  // also missing event data
  const a = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: null,
    },
  });

  testData.ist.missingEventInfo.push(a.id);
  testData.ist.noSessionsCreated.push(a.id);

  // basic event: no sessions, but complete data
  const b = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      eventSubmitted: true,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  testData.ist.noSessionsCreated.push(b.id);

  // complete event with incomplete sessions, but no date on the sessions
  // will not appear in alerts
  const c = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      eventSubmitted: true,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  const c1 = await SessionReportPilot.create({
    eventId: c.id,
    data: {
      sessionName: faker.datatype.string(),
    },
  });

  testData.ids.push(c.id);
  testData.ids.push(c1.id);

  // complete event, 20 days past end date
  const e = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 2)),
      endDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      eventSubmitted: true,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
    },
  });

  const e1 = await SessionReportPilot.create({
    eventId: e.id,
    data: {},
  });

  testData.ist.eventNotCompleted.push(e.id);
  testData.ids.push(e1.id);

  const f = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      eventSubmitted: true,
    },
  });

  testData.ids.push(f.id);

  // poc incomplete session
  const f1 = await SessionReportPilot.create({
    eventId: f.id,
    data: {
      sessionName: faker.datatype.string(),
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      duration: 'Series',
      objective: 'This is an objective',
      objectiveTopics: ['Coaching'],
      objectiveTrainers: ['HBHS'],
      ttaProvided: 'Test TTA',
      supportType: 'Maintaining',
      useIpdCourses: true,
      courses: [],
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'yes',
      regionalOfficeTta: 'TTAC',
      nextSteps: [{ completeDate: new Date(), note: 'Next step 1' }],
      pocComplete: false,
      collabComplete: true,
    },
  });

  testData.ist.missingSessionInfo.push(f1.id);

  const g = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      eventSubmitted: true,
    },
  });

  testData.ids.push(g.id);

  // owner incomplete session
  const g1 = await SessionReportPilot.create({
    eventId: g.id,
    data: {
      sessionName: faker.datatype.string(),
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      duration: 'Series',
      objective: 'This is an objective',
      objectiveTopics: ['Coaching'],
      objectiveTrainers: ['HBHS'],
      ttaProvided: 'Test TTA',
      supportType: 'Maintaining',
      useIpdCourses: true,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'yes',
      regionalOfficeTta: 'TTAC',
      nextSteps: [{ completeDate: new Date(), note: 'Next step 1' }],
      pocComplete: true,
      collabComplete: false,
    },
  });

  testData.ist.missingSessionInfo.push(g1.id);

  // should not appear in alerts, as it is compete
  const finalSesh = await SessionReportPilot.create({
    eventId: g.id,
    data: {
      status: TRAINING_REPORT_STATUSES.COMPLETE,
      sessionName: faker.datatype.string(),
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      duration: 'Series',
      objective: 'This is an objective',
      objectiveTopics: ['Coaching'],
      objectiveTrainers: ['HBHS'],
      ttaProvided: 'Test TTA',
      supportType: 'Maintaining',
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'yes',
      nextSteps: [{ completeDate: new Date(), note: 'Next step 1' }],
      pocComplete: true,
      collabComplete: false,
    },
  });

  testData.ids.push(finalSesh.id);

  testData.ids = new Set([
    ...testData.ids,
    ...testData.ist.missingEventInfo,
    ...testData.ist.missingSessionInfo,
    ...testData.ist.noSessionsCreated,
    ...testData.ist.eventNotCompleted,
  ]);

  return testData;
}

describe('getTrainingReportAlerts', () => {
  const ownerId = faker.datatype.number();
  let snapshot;

  beforeAll(async () => {
    snapshot = await transactionModule.captureSnapshot();
  });

  afterAll(async () => {
    await transactionModule.rollbackToSnapshot(snapshot);
    await sequelize.close();
  });

  describe('getAllAlerts', () => {
    let testData;
    beforeAll(async () => {
      testData = await createEvents({ ownerId });
    });

    it('fetches the correct alerts', async () => {
      const alerts = await getTrainingReportAlerts();
      const idsToCheck = alerts.map((i) => i.id).filter((i) => testData.ids.has(i));

      expect(idsToCheck.sort()).toStrictEqual([
        ...testData.ist.missingEventInfo,
        ...testData.ist.missingSessionInfo,
        ...testData.ist.noSessionsCreated,
        ...testData.ist.eventNotCompleted,
      ].sort());
    });
  });
});
