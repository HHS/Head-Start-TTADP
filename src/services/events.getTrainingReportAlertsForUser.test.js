/* eslint-disable max-len */
import faker from '@faker-js/faker';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import { EventReportPilot, SessionReportPilot, sequelize, User } from '../models';
import { getTrainingReportAlertsForUser } from './event';

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

      expect(alerts.map((i) => i.id).sort()).toStrictEqual(
        [
          ...testData.ist.missingEventInfo,
          ...testData.ist.missingSessionInfo,
          ...testData.ist.noSessionsCreated,
          ...testData.ist.eventNotCompleted,
        ].sort()
      );
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

      expect(alerts.map((i) => i.id).sort()).toStrictEqual(
        [
          ...testData.ist.missingEventInfo,
          ...testData.ist.missingSessionInfo,
          ...testData.ist.noSessionsCreated,
          // ...testData.ist.eventNotCompleted,
        ].sort()
      );
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
      expect(alerts.map(({ id }) => id).sort()).toStrictEqual(
        testData.poc.missingSessionInfo.sort()
      );
    });
  });

  describe('new flow (Regional PD w/ NC + facilitation = national_center)', () => {
    const ownerId = faker.datatype.number();
    const collaboratorId = faker.datatype.number();
    const pocId = faker.datatype.number();

    let eventOwnerMissing;
    let eventCollabMissing;
    let eventBothComplete;
    let eventPocCreated;
    let sessionOwnerMissing;
    let sessionCollabMissing;
    let sessionBothComplete;
    let sessionPocCreated;

    const oneMonthAgo = () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d;
    };

    beforeAll(async () => {
      await User.bulkCreate([
        {
          id: ownerId,
          homeRegionId: regionId,
          hsesUsername: faker.datatype.string(),
          hsesUserId: faker.datatype.string(),
          email: faker.internet.email(),
          lastLogin: new Date(),
        },
        {
          id: collaboratorId,
          homeRegionId: regionId,
          hsesUsername: faker.datatype.string(),
          hsesUserId: faker.datatype.string(),
          email: faker.internet.email(),
          lastLogin: new Date(),
        },
        {
          id: pocId,
          homeRegionId: regionId,
          hsesUsername: faker.datatype.string(),
          hsesUserId: faker.datatype.string(),
          email: faker.internet.email(),
          lastLogin: new Date(),
        },
      ]);

      const baseEventData = {
        eventName: faker.datatype.string(),
        eventId: `R0${regionId}-TR-${faker.datatype.number(4)}`,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        eventSubmitted: true,
        eventOrganizer: 'Regional PD Event (with National Centers)',
      };

      // Owner-side missing: ownerComplete=false, collabComplete=true.
      eventOwnerMissing = await EventReportPilot.create({
        ownerId,
        collaboratorIds: [collaboratorId],
        pocIds: [],
        regionId,
        data: {
          ...baseEventData,
          eventId: `R0${regionId}-TR-OWN-${faker.datatype.number(4)}`,
          startDate: oneMonthAgo(),
          endDate: new Date(),
        },
      });

      sessionOwnerMissing = await SessionReportPilot.create({
        eventId: eventOwnerMissing.id,
        data: {
          sessionName: faker.datatype.string(),
          startDate: oneMonthAgo(),
          endDate: new Date(),
          facilitation: 'national_center',
          ownerComplete: false,
          collabComplete: true,
        },
      });

      // Collab-side missing: ownerComplete=true, collabComplete=false.
      eventCollabMissing = await EventReportPilot.create({
        ownerId,
        collaboratorIds: [collaboratorId],
        pocIds: [],
        regionId,
        data: {
          ...baseEventData,
          eventId: `R0${regionId}-TR-COL-${faker.datatype.number(4)}`,
          startDate: oneMonthAgo(),
          endDate: new Date(),
        },
      });

      sessionCollabMissing = await SessionReportPilot.create({
        eventId: eventCollabMissing.id,
        data: {
          sessionName: faker.datatype.string(),
          startDate: oneMonthAgo(),
          endDate: new Date(),
          facilitation: 'national_center',
          ownerComplete: true,
          collabComplete: false,
        },
      });

      // Both sides complete: no missing-session alert.
      eventBothComplete = await EventReportPilot.create({
        ownerId,
        collaboratorIds: [collaboratorId],
        pocIds: [],
        regionId,
        data: {
          ...baseEventData,
          eventId: `R0${regionId}-TR-OK-${faker.datatype.number(4)}`,
          startDate: oneMonthAgo(),
          endDate: new Date(),
        },
      });

      sessionBothComplete = await SessionReportPilot.create({
        eventId: eventBothComplete.id,
        data: {
          sessionName: faker.datatype.string(),
          startDate: oneMonthAgo(),
          endDate: new Date(),
          facilitation: 'national_center',
          ownerComplete: true,
          collabComplete: true,
        },
      });

      // POC-created new-flow session: pocComplete is the completion signal
      // (per SessionForm/index.js submit handler). With pocComplete: false and
      // ownerComplete undefined the POC should still receive a
      // missingSessionInfo alert at 19+ days past startDate.
      eventPocCreated = await EventReportPilot.create({
        ownerId,
        collaboratorIds: [collaboratorId],
        pocIds: [pocId],
        regionId,
        data: {
          ...baseEventData,
          eventId: `R0${regionId}-TR-POC-${faker.datatype.number(4)}`,
          startDate: oneMonthAgo(),
          endDate: new Date(),
        },
      });

      sessionPocCreated = await SessionReportPilot.create({
        eventId: eventPocCreated.id,
        data: {
          sessionName: faker.datatype.string(),
          startDate: oneMonthAgo(),
          endDate: new Date(),
          facilitation: 'national_center',
          pocComplete: false,
        },
      });
    });

    afterAll(async () => {
      const eventIds = [
        eventOwnerMissing.id,
        eventCollabMissing.id,
        eventBothComplete.id,
        eventPocCreated.id,
      ];
      await SessionReportPilot.destroy({ where: { eventId: eventIds } });
      await EventReportPilot.destroy({ where: { id: eventIds } });
      await User.destroy({ where: { id: [ownerId, collaboratorId, pocId] } });
    });

    it('owner sees a missingSessionInfo alert when ownerComplete is false', async () => {
      const alerts = await getTrainingReportAlertsForUser(ownerId, [regionId]);
      const sessionIds = alerts.filter((a) => a.isSession).map((a) => a.id);
      expect(sessionIds).toContain(sessionOwnerMissing.id);
      // The owner does NOT get an alert for the session where their side is
      // already complete (even though collabComplete is false there).
      expect(sessionIds).not.toContain(sessionCollabMissing.id);
      expect(sessionIds).not.toContain(sessionBothComplete.id);
    });

    it('collaborator sees a missingSessionInfo alert when collabComplete is false', async () => {
      const alerts = await getTrainingReportAlertsForUser(collaboratorId, [regionId]);
      const sessionIds = alerts.filter((a) => a.isSession).map((a) => a.id);
      expect(sessionIds).toContain(sessionCollabMissing.id);
      // Collaborator does NOT get an alert for the session where their side
      // is already complete.
      expect(sessionIds).not.toContain(sessionOwnerMissing.id);
      expect(sessionIds).not.toContain(sessionBothComplete.id);
    });

    it('POC sees a missingSessionInfo alert when pocComplete is false on a POC-created new-flow session', async () => {
      // Regression test for the case where canCreateSession() now includes
      // POCs: a POC who creates a new-flow session must still receive the
      // 19-day missingSessionInfo alert even though POC is typically not
      // involved in the new flow.
      const alerts = await getTrainingReportAlertsForUser(pocId, [regionId]);
      const sessionIds = alerts.filter((a) => a.isSession).map((a) => a.id);
      expect(sessionIds).toContain(sessionPocCreated.id);
    });

    it('POC does not see missingSessionInfo for owner-driven new-flow sessions (using ownerComplete)', async () => {
      // For owner-created new-flow sessions where ownerComplete is the
      // completion signal (and pocComplete is undefined), POCs should not
      // be alerted.
      const alerts = await getTrainingReportAlertsForUser(pocId, [regionId]);
      const sessionIds = alerts.filter((a) => a.isSession).map((a) => a.id);
      expect(sessionIds).not.toContain(sessionOwnerMissing.id);
      expect(sessionIds).not.toContain(sessionBothComplete.id);
    });
  });
});
