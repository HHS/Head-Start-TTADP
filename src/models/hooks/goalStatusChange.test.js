import faker from '@faker-js/faker';
import {
  sequelize,
  GoalStatusChange,
  Grant,
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
  hsesUserId: fakeName,
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
    await Goal.destroy({ where: { id: goal.id } });
    await GoalStatusChange.destroy({ where: { id: goalStatusChange.id } });
    await Grant.destroy({ where: { id: grant.id } });
    await User.destroy({ where: { id: user.id } });
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
  });
});