import { faker } from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import db from '../models';
import { createReport, destroyReport } from '../testUtils';
import changeGoalStatus, { changeGoalStatusWithSystemUser } from './changeGoalStatus';

const fakeName = faker.person.firstName() + faker.person.lastName();
const mockUser = {
  id: faker.number.int({ min: 0, max: 99999 }),
  homeRegionId: 1,
  name: fakeName,
  hsesUsername: fakeName,
  hsesUserId: fakeName,
  lastLogin: new Date(),
};

describe('changeGoalStatus service', () => {
  let user;
  let role;
  let goal;
  let additionalGoal;
  let activeReportGoal;
  let activeReport;
  let systemChangedGoal;
  let grant;
  let recipient;
  const newStatus = 'In Progress';
  const reason = 'All objectives achieved';
  const context = 'Tree planted successfully';

  beforeAll(async () => {
    user = await db.User.create(mockUser);
    recipient = await db.Recipient.create({
      id: faker.number.int({ min: 0, max: 99999 }),
      name: faker.person.firstName(),
    });
    grant = await db.Grant.create({
      id: faker.number.int({ min: 0, max: 99999 }),
      number: faker.string.sample(),
      recipientId: recipient.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
    });
    goal = await db.Goal.create({
      name: 'Plant a tree',
      status: 'Draft',
      grantId: grant.id,
    });
    additionalGoal = await db.Goal.create({
      name: 'Plant a tree',
      status: 'Draft',
      grantId: grant.id,
    });
    systemChangedGoal = await db.Goal.create({
      name: 'Change status using system user',
      status: 'Draft',
      grantId: grant.id,
    });
    activeReportGoal = await db.Goal.create({
      name: 'Goal on an active report',
      status: 'In Progress',
      grantId: grant.id,
    });
    activeReport = await createReport({
      regionId: grant.regionId,
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.DRAFT,
      submissionStatus: REPORT_STATUSES.DRAFT,
    });
    await db.ActivityReportGoal.create({
      activityReportId: activeReport.id,
      goalId: activeReportGoal.id,
      status: activeReportGoal.status,
    });
    role = await db.Role.create({
      id: faker.number.int({ min: 0, max: 99999 }),
      name: 'Astronaut',
      isSpecialist: true,
    });
    await db.UserRole.create({
      userId: user.id,
      roleId: role.id,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await db.ActivityReportGoal.destroy({
      where: {
        activityReportId: activeReport.id,
      },
    });
    await destroyReport(activeReport);
    await db.Goal.destroy({
      where: {
        id: [goal.id, systemChangedGoal.id, additionalGoal.id, activeReportGoal.id],
      },
      force: true,
    });
    await db.GrantNumberLink.destroy({ where: { grantId: grant.id }, force: true });
    await db.Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await db.Recipient.destroy({ where: { id: recipient.id } });
    await db.UserRole.destroy({ where: { userId: user.id } });
    await db.Role.destroy({ where: { id: role.id } });
    await db.User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });

  it('should change the status of a goal and create a status change log', async () => {
    await changeGoalStatus({
      goalId: goal.id,
      userId: mockUser.id,
      newStatus,
      reason,
      context,
    });

    const updatedGoal = await db.Goal.findByPk(goal.id);
    const statusChangeLog = await db.GoalStatusChange.findOne({
      where: { goalId: goal.id, newStatus },
    });

    expect(updatedGoal.status).toBe(newStatus);
    expect(statusChangeLog).toBeTruthy();
    expect(statusChangeLog.oldStatus).toBe('Draft');
    expect(statusChangeLog.newStatus).toBe(newStatus);
    expect(statusChangeLog.reason).toBe(reason);
    expect(statusChangeLog.context).toBe(context);
    expect(statusChangeLog.userId).toBe(mockUser.id);
    expect(statusChangeLog.userName).toBe(user.name);
    expect(statusChangeLog.userRoles).toStrictEqual(['Astronaut']);
  });

  it('overrides performedAt', async () => {
    const performedAt = '2025-01-01T00:00:00.000Z';
    await changeGoalStatus({
      goalId: additionalGoal.id,
      userId: mockUser.id,
      newStatus,
      reason,
      context,
      performedAt,
    });

    const updatedGoal = await db.Goal.findByPk(additionalGoal.id);
    const statusChangeLog = await db.GoalStatusChange.findOne({
      where: { goalId: additionalGoal.id, newStatus },
    });

    expect(updatedGoal.status).toBe(newStatus);
    expect(statusChangeLog).toBeTruthy();
    expect(statusChangeLog.oldStatus).toBe('Draft');
    expect(statusChangeLog.newStatus).toBe(newStatus);
    expect(statusChangeLog.reason).toBe(reason);
    expect(statusChangeLog.context).toBe(context);
    expect(statusChangeLog.userId).toBe(mockUser.id);
    expect(statusChangeLog.userName).toBe(user.name);
    expect(statusChangeLog.userRoles).toStrictEqual(['Astronaut']);
    expect(statusChangeLog.performedAt).toStrictEqual(new Date(performedAt));
  });

  it('should throw an error if the goal does not exist', async () => {
    jest.spyOn(db.Goal, 'findByPk').mockResolvedValueOnce(null);

    await expect(
      changeGoalStatus({
        goalId: goal.id,
        userId: mockUser.id,
        newStatus,
        reason,
        context,
      })
    ).rejects.toThrow('Goal or user not found');
  });

  it('should throw an error if the user does not exist', async () => {
    jest.spyOn(db.User, 'findOne').mockResolvedValueOnce(null);

    await expect(
      changeGoalStatus({
        goalId: goal.id,
        userId: mockUser.id,
        newStatus,
        reason,
        context,
      })
    ).rejects.toThrow('Goal or user not found');
  });

  it('changeGoalStatusWithSystemUser should change the status of a goal and create a status change log', async () => {
    await changeGoalStatusWithSystemUser({
      goalId: systemChangedGoal.id,
      newStatus,
      reason,
      context,
    });

    const updatedGoal = await db.Goal.findByPk(systemChangedGoal.id);
    const statusChangeLog = await db.GoalStatusChange.findOne({
      where: { goalId: systemChangedGoal.id, newStatus },
    });

    expect(updatedGoal.status).toBe(newStatus);
    expect(statusChangeLog).toBeTruthy();
    expect(statusChangeLog.oldStatus).toBe('Draft');
    expect(statusChangeLog.newStatus).toBe(newStatus);
    expect(statusChangeLog.reason).toBe(reason);
    expect(statusChangeLog.context).toBe(context);
    expect(statusChangeLog.userId).toBe(null);
    expect(statusChangeLog.userName).toBe('system');
    expect(statusChangeLog.userRoles).toBe(null);
  });

  it('changeGoalStatusWithSystemUser should throw an error if the goal does not exist', async () => {
    jest.spyOn(db.Goal, 'findByPk').mockResolvedValueOnce(null);

    await expect(
      changeGoalStatusWithSystemUser({
        goalId: goal.id,
        newStatus,
        reason,
        context,
      })
    ).rejects.toThrow('Goal not found');
  });

  it.each([
    REPORT_STATUSES.DRAFT,
    REPORT_STATUSES.SUBMITTED,
    REPORT_STATUSES.NEEDS_ACTION,
  ])('blocks direct closure when the goal is on a %s report', async (calculatedStatus) => {
    await activeReport.update({ calculatedStatus }, { hooks: false });
    const statusChange = {
      goalId: activeReportGoal.id,
      newStatus: 'Closed',
      reason,
      context,
    };

    await expect(
      changeGoalStatus({
        ...statusChange,
        userId: mockUser.id,
      })
    ).rejects.toMatchObject({
      code: 'GOAL_STATUS_CHANGE_BLOCKED',
      reasons: ['ACTIVE_ACTIVITY_REPORT'],
    });

    await activeReportGoal.reload();
    expect(activeReportGoal.status).toBe('In Progress');
  });

  it('blocks system closure when the goal is on an active report', async () => {
    await expect(
      changeGoalStatusWithSystemUser({
        goalId: activeReportGoal.id,
        newStatus: 'Closed',
        reason,
        context,
      })
    ).rejects.toMatchObject({
      code: 'GOAL_STATUS_CHANGE_BLOCKED',
      reasons: ['ACTIVE_ACTIVITY_REPORT'],
    });
  });

  it('should not create a status change record when new status matches current status', async () => {
    const currentStatus = 'Draft';
    const testGoal = await db.Goal.create({
      name: 'Test no-change goal',
      status: currentStatus,
      grantId: grant.id,
    });

    await changeGoalStatus({
      goalId: testGoal.id,
      userId: mockUser.id,
      newStatus: currentStatus, // Same as current status
      reason: 'No change needed',
      context: 'Testing no status change',
    });

    const statusChangeLogs = await db.GoalStatusChange.findAll({
      where: { goalId: testGoal.id },
    });

    // only 1 because the initial one we created
    expect(statusChangeLogs.length).toBe(1);

    // Clean up
    await db.Goal.destroy({ where: { id: testGoal.id }, force: true });
  });
});
