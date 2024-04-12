import faker from '@faker-js/faker';
import changeGoalStatus from './changeGoalStatus';
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
  let goal;
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
  });

  afterAll(async () => {
    await db.User.destroy({ where: { id: mockUser.id } });
    await db.Goal.destroy({ where: { id: goal.id } });
    await db.Grant.destroy({ where: { id: grant.id } });
    await db.Recipient.destroy({ where: { id: recipient.id } });
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
});
