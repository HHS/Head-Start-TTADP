/* eslint-disable max-len */
import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import {
  TRAINING_REPORT_STATUSES,
} from '@ttahub/common';
import {
  EventReportPilot,
  SessionReportPilot,
  User,
  sequelize,
} from '../models';
import {
  getTrainingReportAlertsForUser,
} from './event';

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

  // event that has no start date (will not appear in alerts)
  await EventReportPilot.create(baseEvent);

  // event with no sessions and a start date of today (Will not appear in alerts)
  await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(),
    },
  });

  const testData = {
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

  // event with no sessions and a start date of one month ago (Will appear in alerts)
  // endDate is null so it won't trigger missingEventInfo alert
  const a = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: null,
    },
  });

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

  await SessionReportPilot.create({
    eventId: c.id,
    data: {
      sessionName: faker.datatype.string(),
    },
  });

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

  await SessionReportPilot.create({
    eventId: e.id,
    data: {},
  });

  testData.ist.eventNotCompleted.push(e.id);

  const f = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      eventSubmitted: true,
    },
  });

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

  testData.poc.missingSessionInfo.push(f1.id);

  const g = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      eventSubmitted: true,
    },
  });

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
  await SessionReportPilot.create({
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

  return testData;
}

describe('getTrainingReportAlertsForUser', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  describe('event owner', () => {
    const ownerId = faker.datatype.number();
    let testData;
    beforeAll(async () => {
      await User.create({
        id: ownerId,
        homeRegionId: regionId,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        email: faker.internet.email(),
        lastLogin: new Date(),
      });
      testData = await createEvents({ ownerId });
    });

    afterAll(async () => {
      const events = await EventReportPilot.findAll({ where: { ownerId } });
      await SessionReportPilot.destroy({ where: { eventId: events.map(({ id }) => id) } });
      await EventReportPilot.destroy({ where: { ownerId } });
      await User.destroy({ where: { id: ownerId } });
    });

    it('fetches the correct alerts for owners', async () => {
      const alerts = await getTrainingReportAlertsForUser(ownerId, [regionId]);

      expect(alerts.map((i) => i.id).sort()).toStrictEqual([
        ...testData.ist.missingEventInfo,
        ...testData.ist.missingSessionInfo,
        ...testData.ist.noSessionsCreated,
        ...testData.ist.eventNotCompleted,
      ].sort());
    });
  });

  describe('event collaborator', () => {
    const collaboratorId = faker.datatype.number();
    let testData;
    beforeAll(async () => {
      await User.create({
        id: collaboratorId,
        homeRegionId: regionId,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        email: faker.internet.email(),
        lastLogin: new Date(),
      });
      testData = await createEvents({ collaboratorId });
    });

    afterAll(async () => {
      const events = await EventReportPilot.findAll({
        where: {
          collaboratorIds: {
            [Op.contains]: [collaboratorId],
          },
        },
      });
      await SessionReportPilot.destroy({ where: { eventId: events.map(({ id }) => id) } });
      await EventReportPilot.destroy({ where: { id: events.map(({ id }) => id) } });
      await User.destroy({ where: { id: collaboratorId } });
    });

    it('fetches the correct alerts for collaborators', async () => {
      const alerts = await getTrainingReportAlertsForUser(collaboratorId, [regionId]);

      expect(alerts.map((i) => i.id).sort()).toStrictEqual([
        ...testData.ist.missingEventInfo,
        ...testData.ist.missingSessionInfo,
        ...testData.ist.noSessionsCreated,
        // ...testData.ist.eventNotCompleted,
      ].sort());
    });
  });
  describe('event poc', () => {
    const pocId = faker.datatype.number();
    let testData;
    beforeAll(async () => {
      await User.create({
        id: pocId,
        homeRegionId: regionId,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        email: faker.internet.email(),
        lastLogin: new Date(),
      });
      testData = await createEvents({ pocId });
    });

    afterAll(async () => {
      const events = await EventReportPilot.findAll({
        where: {
          pocIds: {
            [Op.contains]: [pocId],
          },
        },
      });
      await SessionReportPilot.destroy({ where: { eventId: events.map(({ id }) => id) } });
      await EventReportPilot.destroy({ where: { id: events.map(({ id }) => id) } });
      await User.destroy({ where: { id: pocId } });
    });

    it('fetches the correct alerts for poc', async () => {
      const alerts = await getTrainingReportAlertsForUser(pocId, [regionId]);
      expect(alerts.map(({ id }) => id).sort()).toStrictEqual(testData.poc.missingSessionInfo.sort());
    });
  });
});
