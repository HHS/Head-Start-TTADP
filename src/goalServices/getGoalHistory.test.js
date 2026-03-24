import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import crypto from 'crypto';
import httpContext from 'express-http-context';
import SCOPES from '../middleware/scopeConstants';
import db, {
  ActivityReport,
  ActivityReportCollaborator,
  ActivityReportObjective,
  CollaboratorRole,
  Goal,
  GoalTemplate,
  Grant,
  Objective,
  Permission,
  Recipient,
  Role,
  User,
} from '../models';
import { getUniqueId } from '../testUtils';
import { getGoalHistory } from './goals';

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
  let collaboratorUser;
  let collaborator;
  let collaboratorRole;
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

    // Create a collaborator user and attach them to report1 with a known role.
    collaboratorUser = await User.create({
      homeRegionId: REGION_ID,
      hsesUsername: faker.internet.email(),
      hsesUserId: `fake${faker.datatype.number({ min: 100001, max: 200000 })}`,
      email: faker.internet.email(),
      name: faker.name.findName(),
      role: ['Health Specialist'],
      lastLogin: new Date(),
    });

    collaborator = await ActivityReportCollaborator.create({
      activityReportId: report1.id,
      userId: collaboratorUser.id,
    });

    const healthSpecialistRole = await Role.findOne({ where: { fullName: 'Health Specialist' } });
    if (!healthSpecialistRole) throw new Error('Health Specialist role not found in database');
    collaboratorRole = await CollaboratorRole.create({
      activityReportCollaboratorId: collaborator.id,
      roleId: healthSpecialistRole.id,
    });
  });

  afterAll(async () => {
    await CollaboratorRole.destroy({
      where: { id: collaboratorRole.id },
    });
    await ActivityReportCollaborator.destroy({
      where: { id: collaborator.id },
    });
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
      where: { id: [user.id, collaboratorUser.id] },
    });
    await db.sequelize.close();
  });

  it('returns the correct overview metrics', async () => {
    const result = await getGoalHistory(goalSuspended.id);

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('goals');
    expect(result).toHaveProperty('overview');

    const { overview } = result;
    // objective1 links to report1 AND report2; objective2 links to report1 only → 2 unique ARs
    expect(overview.activityReports).toBe(2);
    // 2 objectives on the Suspended goal; Closed goal has none
    expect(overview.objectives).toBe(2);
    // 1 goal with status Closed
    expect(overview.closures).toBe(1);
    // 1 goal with status Suspended
    expect(overview.suspensions).toBe(1);
  });

  it('only includes objectives created via RTR or on approved ARs', async () => {
    // Create an objective that should NOT be included by the service filter
    const excludedObjective = await Objective.create({
      title: faker.random.words(5),
      goalId: goalSuspended.id,
      status: 'Suspended',
      createdVia: 'activityReport',
      onApprovedAR: false,
    });

    try {
      const result = await getGoalHistory(goalSuspended.id);

      const returnedObjectiveIds = result.goals.flatMap((g) => g.objectives || []).map((o) => o.id);

      expect(returnedObjectiveIds).not.toContain(excludedObjective.id);
    } finally {
      await Objective.destroy({
        where: { id: excludedObjective.id },
        force: true,
      });
    }
  });

  it('only counts activity reports with APPROVED calculatedStatus in overview.activityReports', async () => {
    // Create a non-approved activity report linked to objective1; it should be ignored
    const extraReport = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      numberOfParticipants: 1,
      deliveryMethod: 'in-person',
      duration: 1,
      regionId: REGION_ID,
      endDate: '2021-01-02T12:00:00Z',
      startDate: '2021-01-02T12:00:00Z',
      requester: 'requester',
      targetPopulations: ['pop'],
      reason: ['reason'],
      participants: ['participants'],
      topics: ['Program Planning and Services'],
      ttaType: ['technical-assistance'],
      version: 2,
      userId: user.id,
    });

    const extraAro = await ActivityReportObjective.create({
      activityReportId: extraReport.id,
      objectiveId: objective1.id,
      status: 'Suspended',
    });

    try {
      const result = await getGoalHistory(goalSuspended.id);

      const uniqueArIds = new Set(
        result.goals
          .flatMap((g) => g.objectives || [])
          .flatMap((o) => o.activityReportObjectives || [])
          .map((aro) => aro.activityReport?.id)
          .filter(Boolean)
      );

      // Still only the two APPROVED reports from the main fixture
      expect(uniqueArIds.size).toBe(2);
      expect(uniqueArIds).toEqual(new Set([report1.id, report2.id]));
    } finally {
      await ActivityReportObjective.destroy({ where: { id: extraAro.id } });
      await ActivityReport.destroy({ where: { id: extraReport.id } });
    }
  });

  it('includes both goals in the history', async () => {
    const result = await getGoalHistory(goalSuspended.id);

    expect(result.goals).toHaveLength(2);
    const statuses = result.goals.map((g) => g.status);
    expect(statuses).toEqual(expect.arrayContaining(['Suspended', 'Closed']));
  });

  it('returns null when the goal does not exist', async () => {
    const result = await getGoalHistory(99999999);
    expect(result).toBeNull();
  });

  it('includes only id and displayId on activity reports within objective AROs (not author or collaborators)', async () => {
    const result = await getGoalHistory(goalSuspended.id);

    const aros = result.goals
      .flatMap((g) => g.objectives || [])
      .flatMap((o) => o.activityReportObjectives || [])
      .filter((aro) => aro.activityReport);

    expect(aros.length).toBeGreaterThan(0);

    aros.forEach((aro) => {
      expect(aro.activityReport.id).toBeDefined();
      expect(aro.activityReport.displayId).toBeDefined();
      // author and activityReportCollaborators are no longer fetched;
      // specialist data is aggregated via SQL into ttaSpecialists instead
      expect(aro.activityReport.author).toBeUndefined();
      expect(aro.activityReport.activityReportCollaborators).toBeUndefined();
    });
  });

  it('returns backend-prepared, deduplicated and sorted TTA specialists per objective', async () => {
    const result = await getGoalHistory(goalSuspended.id);

    const suspendedGoal = result.goals.find((g) => g.id === goalSuspended.id);
    const targetObjective = (suspendedGoal.objectives || []).find((o) => o.id === objective1.id);

    expect(targetObjective.ttaSpecialists).toBeDefined();
    expect(targetObjective.ttaSpecialists).toHaveLength(2);

    // Backend processing guarantees both distinct and sorted specialist strings.
    expect(new Set(targetObjective.ttaSpecialists).size).toBe(
      targetObjective.ttaSpecialists.length
    );
    const sortedSpecialists = [...targetObjective.ttaSpecialists].sort((a, b) =>
      a.localeCompare(b)
    );
    expect(targetObjective.ttaSpecialists).toEqual(sortedSpecialists);

    const authorMatches = targetObjective.ttaSpecialists.filter((entry) =>
      entry.includes(user.name)
    );
    expect(authorMatches).toHaveLength(1);

    expect(targetObjective.ttaSpecialists.join(' | ')).toContain(collaboratorUser.name);
  });
});
