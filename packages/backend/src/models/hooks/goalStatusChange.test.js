import faker from '@faker-js/faker';
import {
  sequelize,
  GoalStatusChange,
  Grant,
  GrantNumberLink,
  Goal,
  Recipient,
  User,
} from '..';

const fakeName = faker.name.firstName() + faker.name.lastName();

const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: fakeName,
  hsesUsername: fakeName,
  hsesUserId: faker.datatype.number(),
  lastLogin: new Date(),
};

describe('GoalStatusChange hooks', () => {
  let grant;
  let goal;
  let user;
  let goalStatusChange;
  let recipient;

  beforeAll(async () => {
    recipient = await Recipient.create({
      id: faker.datatype.number(),
      name: faker.name.firstName(),
    });
    grant = await Grant.create({
      id: faker.datatype.number(),
      number: faker.datatype.string(),
      recipientId: recipient.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
    });
    goal = await Goal.create({
      name: 'Goal for status change hook',
      grantId: grant.id,
      status: 'Draft',
    });
    user = await User.create(mockUser);
  });

  afterAll(async () => {
    await GoalStatusChange.destroy({ where: { id: goalStatusChange.id } });
    await User.destroy({ where: { id: user.id } });
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await GrantNumberLink.destroy({ where: { grantId: grant.id }, force: true });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
    await sequelize.close();
  });

  describe('afterCreate', () => {
    it('should update the goal status', async () => {
      goalStatusChange = await GoalStatusChange.create({
        goalId: goal.id,
        userId: user.id,
        userName: user.name,
        userRoles: ['a', 'b'],
        newStatus: 'In Progress',
        reason: 'Testing status change',
        context: 'Testing',
      });

      await goalStatusChange.reload();
      await goal.reload();

      expect(goal.status).toBe('In Progress');
    });

    it('should not update the goal status if the status is the same', async () => {
      // Create a GoalStatusChange with the same oldStatus and newStatus
      goalStatusChange = await GoalStatusChange.create({
        goalId: goal.id,
        userId: user.id,
        userName: user.name,
        userRoles: ['a', 'b'],
        oldStatus: 'Draft',
        newStatus: 'Draft', // Intentionally setting the same status
        reason: 'Testing no status change',
        context: 'Testing',
      });

      const previousStatus = goal.status;

      await goalStatusChange.reload();
      await goal.reload();

      // The status should remain unchanged
      expect(goal.status).toBe(previousStatus);
    });
  });
});
