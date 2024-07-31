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
  getTrainingReportAlerts,
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
    poc: {
      missingSessionInfo: [],
    },
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

  // complete event with incomplete sessions, but no date on the sessions
  // will not appear in alerts
  const c = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
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

  const d = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  const d1 = await SessionReportPilot.create({
    eventId: d.id,
    data: {
      sessionName: faker.datatype.string(),
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  testData.poc.missingSessionInfo.push(d1.id);
  testData.ist.missingSessionInfo.push(d1.id);

  // complete event, 20 days past end date
  const e = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 2)),
      endDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
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
    },
  });

  // use Courses but no courses
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
    },
  });

  testData.ist.missingSessionInfo.push(f1.id);

  const g = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // use Courses but null courses
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
    },
  });

  testData.ist.missingSessionInfo.push(g1.id);

  const h = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // use missing regional office tta (null)
  const h1 = await SessionReportPilot.create({
    eventId: h.id,
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
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'yes',
      nextSteps: [{ completeDate: new Date(), note: 'Next step 1' }],
    },
  });

  testData.ist.missingSessionInfo.push(h1.id);
  testData.poc.missingSessionInfo.push(h1.id);

  const i = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // use missing regional office tta (empty)
  const i1 = await SessionReportPilot.create({
    eventId: i.id,
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
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'yes',
      regionalOfficeTta: [],
      nextSteps: [{ completeDate: new Date(), note: 'Next step 1' }],
    },
  });

  testData.ist.missingSessionInfo.push(i1.id);
  testData.poc.missingSessionInfo.push(i1.id);

  const j = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // use missing participants (empty)
  const j1 = await SessionReportPilot.create({
    eventId: j.id,
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
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'no',
      participants: [],
      regionalOfficeTta: [],
      nextSteps: [{ completeDate: new Date(), note: 'Next step 1' }],
    },
  });

  testData.ist.missingSessionInfo.push(j1.id);
  testData.poc.missingSessionInfo.push(j1.id);

  const k = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // use missing participants (null)
  const k1 = await SessionReportPilot.create({
    eventId: k.id,
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
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'no',
      regionalOfficeTta: [],
      nextSteps: [{ completeDate: new Date(), note: 'Next step 1' }],
    },
  });

  testData.ist.missingSessionInfo.push(k1.id);
  testData.poc.missingSessionInfo.push(k1.id);

  const l = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // next steps (null)
  const l1 = await SessionReportPilot.create({
    eventId: l.id,
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
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'no',
      participants: [{}],
      regionalOfficeTta: [],
    },
  });

  testData.ist.missingSessionInfo.push(l1.id);
  testData.poc.missingSessionInfo.push(l1.id);

  const m = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // next steps (empty)
  const m1 = await SessionReportPilot.create({
    eventId: m.id,
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
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'no',
      participants: [{}],
      regionalOfficeTta: [],
      nextSteps: [],
    },
  });

  testData.ist.missingSessionInfo.push(m1.id);
  testData.poc.missingSessionInfo.push(m1.id);

  const n = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // next steps (missing date)
  const n1 = await SessionReportPilot.create({
    eventId: n.id,
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
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'no',
      participants: [{}],
      regionalOfficeTta: [],
      nextSteps: [{ completeDate: null, note: 'Next step 1' }],
    },
  });

  testData.ist.missingSessionInfo.push(n1.id);
  testData.poc.missingSessionInfo.push(n1.id);

  const o = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });

  // next steps (missing note)
  const o1 = await SessionReportPilot.create({
    eventId: o.id,
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
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'no',
      participants: [{}],
      regionalOfficeTta: [],
      nextSteps: [{ completeDate: new Date(), note: '' }],
    },
  });

  testData.ist.missingSessionInfo.push(o1.id);
  testData.poc.missingSessionInfo.push(o1.id);

  return testData;
}

describe('getTrainingReportAlerts', () => {
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
      const alerts = await getTrainingReportAlerts(ownerId, [regionId]);

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
            [Op.contains]: collaboratorId,
          },
        },
      });
      await SessionReportPilot.destroy({ where: { eventId: events.map(({ id }) => id) } });
      await EventReportPilot.destroy({ where: { id: events.map(({ id }) => id) } });
      await User.destroy({ where: { id: collaboratorId } });
    });

    it('fetches the correct alerts for collaborators', async () => {
      const alerts = await getTrainingReportAlerts(collaboratorId, [regionId]);

      expect(alerts.map((i) => i.id).sort()).toStrictEqual([
        ...testData.ist.missingEventInfo,
        ...testData.ist.missingSessionInfo,
        ...testData.ist.noSessionsCreated,
        ...testData.ist.eventNotCompleted,
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
            [Op.contains]: pocId,
          },
        },
      });
      await SessionReportPilot.destroy({ where: { eventId: events.map(({ id }) => id) } });
      await EventReportPilot.destroy({ where: { id: events.map(({ id }) => id) } });
      await User.destroy({ where: { id: pocId } });
    });

    it('fetches the correct alerts for poc', async () => {
      const alerts = await getTrainingReportAlerts(pocId, [regionId]);
      expect(alerts.map(({ id }) => id).sort()).toStrictEqual(testData.poc.missingSessionInfo.sort());
    });
  });
});
