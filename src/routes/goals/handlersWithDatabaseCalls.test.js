import crypto from 'crypto';
import faker from '@faker-js/faker';
import httpContext from 'express-http-context';
import { REPORT_STATUSES } from '@ttahub/common';
import { getUniqueId } from '../../testUtils';
import db, {
  ActivityReport,
  ActivityReportObjective,
  Goal,
  GoalTemplate,
  Grant,
  Objective,
  Permission,
  Recipient,
  User,
} from '../../models';
import SCOPES from '../../middleware/scopeConstants';
import { getGoalHistory } from './handlers';

jest.mock('bull');

// Goal.create triggers afterCreate hooks that look up the current user via httpContext.
// The mock starts with no return value; we call mockReturnValue after creating the user.
jest.mock('express-http-context', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

const REGION_ID = 1;

describe('getGoalHistory (database-backed)', () => {
  let user;
  let permission;
  let recipient;
  let grant;
  let goalTemplate;
  // The partial unique index only allows ONE non-Closed goal per (grantId, goalTemplateId).
  // We use one Suspended (current) + one Closed (historical) to exercise all four overview metrics.
  let goalSuspended;
  let goalClosed;
  let objective1;
  let objective2;
  let report1;
  let report2;
  let aro1;
  let aro2;
  let aro3;

  beforeAll(async () => {
    user = await User.create({
      homeRegionId: REGION_ID,
      hsesUsername: faker.internet.email(),
      hsesUserId: `fake${faker.datatype.number({ min: 1, max: 100000 })}`,
      email: faker.internet.email(),
      name: faker.name.findName(),
      role: ['Grants Specialist'],
      lastLogin: new Date(),
    });

    // Point the httpContext mock to the real user so Goal afterCreate hooks can set collaborators.
    httpContext.get.mockReturnValue(user.id);

    permission = await Permission.create({
      userId: user.id,
      regionId: REGION_ID,
      scopeId: SCOPES.READ_REPORTS,
    });

    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 10000, max: 99999 }),
      name: faker.company.companyName(),
      uei: 'NNA5N2KHMGN2',
    });

    grant = await Grant.create({
      id: getUniqueId(),
      number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
      regionId: REGION_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date(),
      recipientId: recipient.id,
    });

    const templateName = faker.random.words(5);
    const hash = crypto.createHmac('md5', templateName).update(templateName).digest('hex');
    goalTemplate = await GoalTemplate.create({
      hash,
      templateName,
      creationMethod: 'Automatic',
    });

    // The Closed goal is created first so it doesn't conflict with the partial unique index.
    // (index only constrains non-Closed goals with goalTemplateId IS NOT NULL)
    goalClosed = await Goal.create({
      name: faker.random.words(5),
      status: 'Closed',
      grantId: grant.id,
      goalTemplateId: goalTemplate.id,
      createdVia: 'rtr',
      prestandard: false,
    });

    // One non-Closed goal (Suspended) is allowed alongside Closed goals.
    goalSuspended = await Goal.create({
      name: faker.random.words(5),
      status: 'Suspended',
      grantId: grant.id,
      goalTemplateId: goalTemplate.id,
      createdVia: 'rtr',
      prestandard: false,
    });

    // Two objectives on the Suspended goal
    [objective1, objective2] = await Promise.all([
      Objective.create({
        title: faker.random.words(5),
        goalId: goalSuspended.id,
        status: 'Suspended',
        createdVia: 'rtr',
      }),
      Objective.create({
        title: faker.random.words(5),
        goalId: goalSuspended.id,
        status: 'Suspended',
        createdVia: 'rtr',
      }),
    ]);

    // Two approved activity reports
    [report1, report2] = await Promise.all([
      ActivityReport.create({
        activityRecipientType: 'recipient',
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        numberOfParticipants: 1,
        deliveryMethod: 'in-person',
        duration: 1,
        regionId: REGION_ID,
        endDate: '2021-01-01T12:00:00Z',
        startDate: '2021-01-01T12:00:00Z',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['Program Planning and Services'],
        ttaType: ['technical-assistance'],
        version: 2,
        userId: user.id,
      }),
      ActivityReport.create({
        activityRecipientType: 'recipient',
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        numberOfParticipants: 1,
        deliveryMethod: 'in-person',
        duration: 1,
        regionId: REGION_ID,
        endDate: '2021-01-01T12:00:00Z',
        startDate: '2021-01-01T12:00:00Z',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['Program Planning and Services'],
        ttaType: ['technical-assistance'],
        version: 2,
        userId: user.id,
      }),
    ]);

    // objective1 on both reports, objective2 on report1 only — unique AR count is 2
    [aro1, aro2, aro3] = await Promise.all([
      ActivityReportObjective.create({
        activityReportId: report1.id,
        objectiveId: objective1.id,
        status: 'Suspended',
      }),
      ActivityReportObjective.create({
        activityReportId: report2.id,
        objectiveId: objective1.id,
        status: 'Suspended',
      }),
      ActivityReportObjective.create({
        activityReportId: report1.id,
        objectiveId: objective2.id,
        status: 'Suspended',
      }),
    ]);
  });

  afterAll(async () => {
    await ActivityReportObjective.destroy({
      where: { id: [aro1.id, aro2.id, aro3.id] },
    });
    await ActivityReport.destroy({
      where: { id: [report1.id, report2.id] },
    });
    await Objective.destroy({
      where: { id: [objective1.id, objective2.id] },
      force: true,
    });
    await Goal.destroy({
      where: { id: [goalSuspended.id, goalClosed.id] },
      force: true,
    });
    await GoalTemplate.destroy({
      where: { id: goalTemplate.id },
      force: true,
    });
    await Permission.destroy({
      where: { id: permission.id },
    });
    await Grant.destroy({
      where: { id: grant.id },
      individualHooks: true,
    });
    await Recipient.destroy({
      where: { id: recipient.id },
    });
    await User.destroy({
      where: { id: user.id },
    });
    await db.sequelize.close();
  });

  it('returns the correct overview metrics', async () => {
    const req = {
      session: { userId: user.id },
      params: { goalId: String(goalSuspended.id) },
      headers: {},
    };
    const res = {
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await getGoalHistory(req, res);

    expect(res.sendStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);

    const [response] = res.json.mock.calls[0];
    expect(response).toHaveProperty('goals');
    expect(response).toHaveProperty('overview');

    const { overview } = response;
    // objective1 links to report1 AND report2; objective2 links to report1 only → 2 unique ARs
    expect(overview.activityReports).toBe(2);
    // 2 objectives on the Suspended goal; Closed goal has none
    expect(overview.objectives).toBe(2);
    // 1 goal with status Closed
    expect(overview.closures).toBe(1);
    // 1 goal with status Suspended
    expect(overview.suspensions).toBe(1);
  });

  it('includes both goals in the history', async () => {
    const req = {
      session: { userId: user.id },
      params: { goalId: String(goalSuspended.id) },
      headers: {},
    };
    const res = {
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await getGoalHistory(req, res);

    const [response] = res.json.mock.calls[0];
    expect(response.goals).toHaveLength(2);
    const statuses = response.goals.map((g) => g.status);
    expect(statuses).toEqual(expect.arrayContaining(['Suspended', 'Closed']));
  });

  it('returns 404 when the goal does not exist', async () => {
    const req = {
      session: { userId: user.id },
      params: { goalId: '99999999' },
      headers: {},
    };
    const res = {
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await getGoalHistory(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(404);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 401 when the user lacks permission for the grant region', async () => {
    const unpermittedUser = await User.create({
      homeRegionId: REGION_ID,
      hsesUsername: faker.internet.email(),
      hsesUserId: `fake${faker.datatype.number({ min: 1, max: 100000 })}`,
      email: faker.internet.email(),
      name: faker.name.findName(),
      role: ['Grants Specialist'],
      lastLogin: new Date(),
    });

    try {
      const req = {
        session: { userId: unpermittedUser.id },
        params: { goalId: String(goalSuspended.id) },
        headers: {},
      };
      const res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
      };

      await getGoalHistory(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(401);
      expect(res.json).not.toHaveBeenCalled();
    } finally {
      await User.destroy({ where: { id: unpermittedUser.id } });
    }
  });
});
