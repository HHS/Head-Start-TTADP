import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import db from '../models';
import {
  createGrant,
  createRecipient,
  createSessionReport,
  createTrainingReport,
  createUser,
} from '../testUtils';
import trSessionsForRecipient from './trSessionsForRecipient';

const { EventReportPilot, Grant, Recipient, SessionReportPilot, User } = db;

// We need to mock this so that we don't try to send emails or otherwise engage the queue
jest.mock('bull');

describe('TR sessions for recipient widget', () => {
  let userCreator;

  let recipient1;
  let recipient2;

  let grant1;
  let grant2;

  let trainingReport1;
  let trainingReport2;

  beforeAll(async () => {
    userCreator = await createUser();

    // recipient 1 - the target recipient for counting
    recipient1 = await createRecipient();
    // recipient 2 - other recipient; sessions on their grants should not count for recipient 1
    recipient2 = await createRecipient();

    // grant 1 belongs to recipient 1
    grant1 = await createGrant({ recipientId: recipient1.id, regionId: userCreator.homeRegionId });
    // grant 2 belongs to recipient 2
    grant2 = await createGrant({ recipientId: recipient2.id, regionId: userCreator.homeRegionId });

    // --- Training report 1: sessions for recipient1 ---
    trainingReport1 = await createTrainingReport({
      collaboratorIds: [],
      pocIds: [],
      ownerId: userCreator.id,
    });

    // Session 1: has recipient1's grant, COMPLETE -> counts for recipient1
    await createSessionReport({
      eventId: trainingReport1.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 10,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    // Session 2: has recipient1's grant, COMPLETE -> counts for recipient1
    await createSessionReport({
      eventId: trainingReport1.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1.5,
        recipients: [{ value: grant1.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 10,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    // Session 3: has recipient1's grant, IN_PROGRESS -> excluded by baseTRScopes (not COMPLETE)
    await createSessionReport({
      eventId: trainingReport1.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 10,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    });

    await trainingReport1.update({
      data: {
        ...trainingReport1.data,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    // --- Training report 2: session only for recipient2 ---
    trainingReport2 = await createTrainingReport({
      collaboratorIds: [],
      pocIds: [],
      ownerId: userCreator.id,
    });

    // Session 4: only has recipient2's grant, COMPLETE -> counts for recipient2, NOT recipient1
    await createSessionReport({
      eventId: trainingReport2.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 2,
        recipients: [{ value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 10,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    await trainingReport2.update({
      data: {
        ...trainingReport2.data,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });
  });

  afterAll(async () => {
    await SessionReportPilot.destroy({
      where: {
        eventId: [trainingReport1.id, trainingReport2.id],
      },
    });

    await EventReportPilot.destroy({
      where: {
        id: [trainingReport1.id, trainingReport2.id],
      },
    });

    await db.GrantNumberLink.destroy({
      where: {
        grantId: [grant1.id, grant2.id],
      },
      force: true,
    });

    await Grant.destroy({
      where: {
        id: [grant1.id, grant2.id],
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: [recipient1.id, recipient2.id],
      },
    });

    await User.destroy({
      where: {
        id: [userCreator.id],
      },
    });

    await db.sequelize.close();
  });

  it('counts only COMPLETE sessions where the recipient has a matching grant', async () => {
    // Scope grant.where to only grant1 (recipient1) — mirrors what grantsFiltersToScopes produces
    const scopes = {
      grant: {
        where: [{ id: [grant1.id] }],
      },
      trainingReport: [{ id: [trainingReport1.id, trainingReport2.id] }],
    } as any;

    const data = await trSessionsForRecipient(scopes);

    // session1 + session2 = 2 (session3 is IN_PROGRESS so excluded; session4 is for recipient2)
    expect(data.numSessions).toBe('2');
    // session1 duration (1) + session2 duration (1.5) = 2.5
    expect(data.sumDuration).toBe(2.5);
    // session1 (10) + session2 (10) = 20 participants
    expect(data.numParticipants).toBe(20);
    // session1 + session2 are both in-person and COMPLETE
    expect(data.numInPerson).toBe(2);
  });

  it('does not count sessions belonging only to other recipients', async () => {
    // Scope grant.where to only grant2 (recipient2)
    const scopes = {
      grant: {
        where: [{ id: [grant2.id] }],
      },
      trainingReport: [{ id: [trainingReport1.id, trainingReport2.id] }],
    } as any;

    const data = await trSessionsForRecipient(scopes);

    // Only session4 has grant2 (recipient2) and is COMPLETE
    expect(data.numSessions).toBe('1');
    // session4 duration (2)
    expect(data.sumDuration).toBe(2);
    // session4 numberOfParticipants = 10
    expect(data.numParticipants).toBe(10);
    // session4 is in-person
    expect(data.numInPerson).toBe(1);
  });

  it('returns 0 when no grants are in scope', async () => {
    const scopes = {
      grant: {
        where: [{ id: [] }],
      },
      trainingReport: [{ id: [trainingReport1.id, trainingReport2.id] }],
    } as any;

    const data = await trSessionsForRecipient(scopes);
    expect(data.numSessions).toBe('0');
    expect(data.sumDuration).toBe(0);
    expect(data.numParticipants).toBe(0);
    expect(data.numInPerson).toBe(0);
  });

  it('sums hybrid session participants from in-person + virtual counts', async () => {
    const hybridTr = await createTrainingReport({
      collaboratorIds: [],
      pocIds: [],
      ownerId: userCreator.id,
    });

    await createSessionReport({
      eventId: hybridTr.id,
      data: {
        deliveryMethod: 'hybrid',
        duration: 1,
        recipients: [{ value: grant1.id }],
        numberOfParticipantsInPerson: 4,
        numberOfParticipantsVirtually: 3,
        // numberOfParticipants intentionally set; hybrid path should ignore it
        numberOfParticipants: 99,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    await hybridTr.update({
      data: {
        ...hybridTr.data,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    try {
      const scopes = {
        grant: {
          where: [{ id: [grant1.id] }],
        },
        trainingReport: [{ id: [hybridTr.id] }],
      } as any;

      const data = await trSessionsForRecipient(scopes);

      expect(data.numSessions).toBe('1');
      // hybrid: 4 + 3 = 7 (numberOfParticipants is ignored on hybrid path)
      expect(data.numParticipants).toBe(7);
      // hybrid session duration (1)
      expect(data.sumDuration).toBe(1);
      // hybrid is NOT counted as in-person — matches the AR overview's strict
      // equality check on the 'in-person' delivery method
      expect(data.numInPerson).toBe(0);
    } finally {
      await SessionReportPilot.destroy({ where: { eventId: hybridTr.id } });
      await EventReportPilot.destroy({ where: { id: hybridTr.id } });
    }
  });

  it('counts only sessions with deliveryMethod === "in-person" in numInPerson', async () => {
    const mixedTr = await createTrainingReport({
      collaboratorIds: [],
      pocIds: [],
      ownerId: userCreator.id,
    });

    // in-person -> counted
    await createSessionReport({
      eventId: mixedTr.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 5,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    // virtual -> not counted
    await createSessionReport({
      eventId: mixedTr.id,
      data: {
        deliveryMethod: 'virtual',
        duration: 1,
        recipients: [{ value: grant1.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 5,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    // hybrid -> not counted as in-person
    await createSessionReport({
      eventId: mixedTr.id,
      data: {
        deliveryMethod: 'hybrid',
        duration: 1,
        recipients: [{ value: grant1.id }],
        numberOfParticipantsVirtually: 1,
        numberOfParticipantsInPerson: 2,
        numberOfParticipants: 0,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    // in-person but IN_PROGRESS -> excluded by baseTRScopes
    await createSessionReport({
      eventId: mixedTr.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 5,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    });

    await mixedTr.update({
      data: {
        ...mixedTr.data,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    try {
      const scopes = {
        grant: {
          where: [{ id: [grant1.id] }],
        },
        trainingReport: [{ id: [mixedTr.id] }],
      } as any;

      const data = await trSessionsForRecipient(scopes);

      // 3 COMPLETE sessions (in-person, virtual, hybrid) — the IN_PROGRESS one is excluded
      expect(data.numSessions).toBe('3');
      // Only the single COMPLETE in-person session counts
      expect(data.numInPerson).toBe(1);
    } finally {
      await SessionReportPilot.destroy({ where: { eventId: mixedTr.id } });
      await EventReportPilot.destroy({ where: { id: mixedTr.id } });
    }
  });
});
