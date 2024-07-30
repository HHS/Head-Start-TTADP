/* eslint-disable max-len */
import faker from '@faker-js/faker';
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
  getTrainingReportAlerts,
} from './event';

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
      eventId: `R0${regionId}-TR-${faker.datatype.number(4)}`,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
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
    poc: {},
  };

  // event with no sessions and a start date of one month ago (Will appear in alerts)
  // also missing event data
  const a = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    },
  });

  testData.ist.missingEventInfo.push(a.id);
  testData.ist.noSessionsCreated.push(a.id);

  // basic event: no sessions, but complete data
  const b = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  testData.ist.noSessionsCreated.push(b.id);

  return testData;
}

describe('getTrainingReportAlerts', () => {
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
    //   try {
      const events = await EventReportPilot.findAll({ where: { ownerId } });
      await SessionReportPilot.destroy({ where: { eventId: events.map(({ id }) => id) } });
      await EventReportPilot.destroy({ where: { ownerId } });
      await User.destroy({ where: { id: ownerId } });
      await sequelize.close();
    //   } catch (err) {
    //     console.log(err);
    //   }
    });

    it('fetches the correct alerts for owners', async () => {
      const alerts = await getTrainingReportAlerts(ownerId);
      expect(alerts.missingEventInfo.map((i) => i.id)).toStrictEqual(testData.ist.missingEventInfo);
      expect(alerts.missingSessionInfo.map((i) => i.id)).toStrictEqual(testData.ist.missingSessionInfo);
      expect(alerts.noSessionsCreated.map((i) => i.id)).toStrictEqual(testData.ist.noSessionsCreated);
      expect(alerts.eventNotCompleted.map((i) => i.id)).toStrictEqual(testData.ist.eventNotCompleted);
      expect(true).toBe(true);
    });
  });
});
