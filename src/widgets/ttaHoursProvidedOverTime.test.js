import { faker } from '@faker-js/faker';
import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import fakerUnique from '../fakerUnique';
import {
  ActivityRecipient,
  ActivityReport,
  ActivityReportGoal,
  EventReportPilot,
  Goal,
  GoalTemplate,
  Grant,
  Recipient,
  SessionReportPilot,
  SessionReportPilotGoalTemplate,
  sequelize,
  User,
} from '../models';
import filtersToScopes from '../scopes';
import ttaHoursProvidedOverTime from './ttaHoursProvidedOverTime';

jest.mock('bull');

const uniqueId = () => fakerUnique(() => faker.number.int({ min: 40001, max: 60000 }));

describe('ttaHoursProvidedOverTime', () => {
  let user;
  let recipient;
  let otherRecipient;
  let grant;
  let otherGrant;
  let templateERSEA;
  let templateTeachingPractices;

  const reports = [];
  const activityRecipients = [];
  const goals = [];
  const activityReportGoals = [];
  const sessions = [];
  const sessionGoalTemplates = [];
  let event;

  let arInPerson;
  let arMultiRecipient;

  let sessionHybrid;
  let sessionLater;

  const makeGrant = (recipientId) =>
    Grant.create({
      id: uniqueId(),
      number: faker.string.sample(8),
      regionId: 1,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2027, 1, 1),
      recipientId,
    });

  const makeReport = async (overrides, grantIds) => {
    const report = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      userId: user.id,
      regionId: 1,
      numberOfParticipants: 5,
      deliveryMethod: 'virtual',
      duration: 1,
      startDate: '2025-10-01',
      endDate: '2025-10-01',
      version: 2,
      ...overrides,
    });
    reports.push(report);
    await Promise.all(
      grantIds.map(async (grantId) => {
        activityRecipients.push(
          await ActivityRecipient.create({ activityReportId: report.id, grantId })
        );
      })
    );
    return report;
  };

  const makeGoal = async (grantId, goalTemplateId, activityReportId) => {
    const goal = await Goal.create(
      {
        name: faker.lorem.sentence(),
        grantId,
        goalTemplateId,
        status: 'In Progress',
        onAR: true,
        onApprovedAR: true,
        prestandard: false,
      },
      { hooks: false }
    );
    goals.push(goal);
    activityReportGoals.push(
      await ActivityReportGoal.create({ activityReportId, goalId: goal.id })
    );
  };

  const makeSession = async (startDate, data, goalTemplateIds = []) => {
    const session = await SessionReportPilot.create({
      eventId: event.id,
      startDate,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        recipients: [{ value: grant.id, label: 'Test Recipient' }],
        sessionName: faker.lorem.words(3),
        ...data,
      },
    });
    sessions.push(session);
    await Promise.all(
      goalTemplateIds.map(async (goalTemplateId) => {
        sessionGoalTemplates.push(
          await SessionReportPilotGoalTemplate.create({
            sessionReportPilotId: session.id,
            goalTemplateId,
          })
        );
      })
    );
    return session;
  };

  beforeAll(async () => {
    user = await User.create({
      homeRegionId: 1,
      name: faker.person.fullName(),
      hsesUsername: faker.internet.email(),
      hsesUserId: `fake${uniqueId()}`,
      lastLogin: new Date(),
    });

    [recipient, otherRecipient] = await Promise.all(
      [1, 2].map(() =>
        Recipient.create({
          id: uniqueId(),
          name: faker.company.name(),
          uei: faker.string.sample(12).toUpperCase(),
        })
      )
    );
    grant = await makeGrant(recipient.id);
    otherGrant = await makeGrant(otherRecipient.id);

    templateERSEA = await GoalTemplate.findOne({ where: { standard: 'ERSEA' } });
    templateTeachingPractices = await GoalTemplate.findOne({
      where: { standard: 'Teaching Practices' },
    });

    // ── Activity reports ───────────────────────────────────────────────────
    arInPerson = await makeReport({ deliveryMethod: 'In-Person', duration: 1.5 }, [grant.id]);
    await makeGoal(grant.id, templateERSEA.id, arInPerson.id);

    // Multi-recipient AR: its goal on the other recipient's grant should not be shown.
    arMultiRecipient = await makeReport({ deliveryMethod: 'virtual', duration: 2 }, [
      grant.id,
      otherGrant.id,
    ]);
    await makeGoal(otherGrant.id, templateTeachingPractices.id, arMultiRecipient.id);

    // Not approved: excluded
    await makeReport({ calculatedStatus: REPORT_STATUSES.SUBMITTED, duration: 5 }, [grant.id]);
    // Other recipient only: excluded
    await makeReport({ duration: 7 }, [otherGrant.id]);

    // ── Training report sessions ───────────────────────────────────────────
    const displayId = `R01-TR-${uniqueId()}`;
    event = await EventReportPilot.create({
      ownerId: user.id,
      regionId: 1,
      pocIds: [user.id],
      collaboratorIds: [user.id],
      eventId: displayId,
      data: {
        eventId: displayId,
        startDate: '10/01/2025',
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    });

    sessionHybrid = await makeSession('2025-10-01', { duration: 1, deliveryMethod: 'hybrid' }, [
      templateTeachingPractices.id,
    ]);
    // Rounds to one decimal place: 2.96 -> 3
    sessionLater = await makeSession('2025-11-15', { duration: 2.96, deliveryMethod: 'virtual' });

    // In progress: excluded
    await makeSession('2025-10-01', {
      duration: 4,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
    });
    // Other recipient only: excluded
    await makeSession('2025-10-01', {
      duration: 6,
      recipients: [{ value: otherGrant.id, label: 'Other' }],
    });
  });

  afterAll(async () => {
    await SessionReportPilotGoalTemplate.destroy({
      where: { id: sessionGoalTemplates.map((s) => s.id) },
    });
    await SessionReportPilot.destroy({ where: { id: sessions.map((s) => s.id) }, force: true });
    await EventReportPilot.destroy({ where: { id: event.id }, force: true });
    await ActivityReportGoal.destroy({
      where: { id: activityReportGoals.map((a) => a.id) },
      force: true,
    });
    await Goal.destroy({ where: { id: goals.map((g) => g.id) }, force: true });
    await ActivityRecipient.destroy({
      where: { id: activityRecipients.map((a) => a.id) },
      force: true,
    });
    await ActivityReport.destroy({ where: { id: reports.map((r) => r.id) }, force: true });
    await Grant.destroy({ where: { id: [grant.id, otherGrant.id] }, individualHooks: true });
    await Recipient.destroy({ where: { id: [recipient.id, otherRecipient.id] } });
    await User.destroy({ where: { id: user.id } });
    await sequelize.close();
  });

  const getScopes = (recipientId) =>
    filtersToScopes(
      { 'recipientId.ctn': [String(recipientId)], 'region.in': ['1'] },
      { userId: user.id }
    );

  it('sums AR and TR session hours by start date with goals, delivery methods, and references', async () => {
    const result = await ttaHoursProvidedOverTime(await getScopes(recipient.id), {});

    expect(result).toEqual([
      {
        startDate: '2025-10-01',
        duration: 4.5,
        goals: ['ERSEA', 'Teaching Practices'],
        deliveryMethods: ['hybrid', 'in-person', 'virtual'],
        activityReports: [
          { id: arInPerson.id, displayId: arInPerson.displayId },
          { id: arMultiRecipient.id, displayId: arMultiRecipient.displayId },
        ],
        trainingReportSessions: [
          {
            id: sessionHybrid.id,
            eventId: event.id,
            eventDisplayId: event.eventId,
            sessionName: sessionHybrid.data.sessionName,
          },
        ],
      },
      {
        startDate: '2025-11-15',
        duration: 2.96,
        goals: [],
        deliveryMethods: ['virtual'],
        activityReports: [],
        trainingReportSessions: [
          {
            id: sessionLater.id,
            eventId: event.id,
            eventDisplayId: event.eventId,
            sessionName: sessionLater.data.sessionName,
          },
        ],
      },
    ]);
  });

  it('returns an empty array when the recipient has no TTA', async () => {
    const emptyRecipient = await Recipient.create({
      id: uniqueId(),
      name: faker.company.name(),
      uei: faker.string.sample(12).toUpperCase(),
    });

    try {
      const result = await ttaHoursProvidedOverTime(await getScopes(emptyRecipient.id), {});
      expect(result).toEqual([]);
    } finally {
      await Recipient.destroy({ where: { id: emptyRecipient.id } });
    }
  });
});
