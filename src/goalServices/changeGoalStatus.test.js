import faker from '@faker-js/faker';
import moment from 'moment';
import changeGoalStatus, { changeGoalStatusWithSystemUser } from './changeGoalStatus';
import db from '../models';

const fakeName = faker.name.firstName() + faker.name.lastName();
const mockUser = {
  id: faker.datatype.number(),
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
  let systemChangedGoal;
  let grant;
  let recipient;
  const newStatus = 'In Progress';
  const reason = 'All objectives achieved';
  const context = 'Tree planted successfully';

  beforeAll(async () => {
    user = await db.User.create(mockUser);
    recipient = await db.Recipient.create({
      id: faker.datatype.number(),
      name: faker.name.firstName(),
    });
    grant = await db.Grant.create({
      id: faker.datatype.number(),
      number: faker.datatype.string(),
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
    role = await db.Role.create({
      id: faker.datatype.number(),
      name: 'Astronaut',
      isSpecialist: true,
    });
    await db.UserRole.create({
      userId: user.id,
      roleId: role.id,
    });
  });

  afterAll(async () => {
    await db.Goal.destroy({
      where: {
        id: [
          goal.id,
          systemChangedGoal.id,
          additionalGoal.id,
        ],
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
    await changeGoalStatus({
      goalId: additionalGoal.id,
      userId: mockUser.id,
      newStatus,
      reason,
      context,
      performedAt: '2025/01/01',
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
    expect(statusChangeLog.performedAt).toStrictEqual(moment('2025/01/01').toDate());
  });

  it('should throw an error if the goal does not exist', async () => {
    await expect(changeGoalStatus({
      goalId: 9999, // non-existent goalId
      userId: mockUser.id,
      newStatus,
      reason,
      context,
    })).rejects.toThrow('Goal or user not found');
  });

  it('should throw an error if the user does not exist', async () => {
    await expect(changeGoalStatus({
      goalId: goal.id,
      userId: 9999, // non-existent userId
      newStatus,
      reason,
      context,
    })).rejects.toThrow('Goal or user not found');
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
    await expect(changeGoalStatusWithSystemUser({
      goalId: 9999, // non-existent goalId
      newStatus,
      reason,
      context,
    })).rejects.toThrow('Goal not found');
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
