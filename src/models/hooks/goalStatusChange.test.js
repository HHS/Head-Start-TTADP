import faker from '@faker-js/faker';
import { GOAL_STATUS, CLOSE_SUSPEND_REASONS } from '@ttahub/common';
import {
  sequelize,
  GoalStatusChange,
  Grant,
  GrantNumberLink,
  Goal,
  Objective,
  Recipient,
  User,
} from '..';
import { OBJECTIVE_STATUS } from '../../constants';

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
  let objective1;
  let objective2;
  let objective3;

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

    // Create objectives for testing updateObjectiveStatusIfSuspended
    objective1 = await Objective.create({
      title: 'Objective 1',
      goalId: goal.id,
      status: GOAL_STATUS.NOT_STARTED,
    });
    objective2 = await Objective.create({
      title: 'Objective 2',
      goalId: goal.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });
    objective3 = await Objective.create({
      title: 'Objective 3',
      goalId: goal.id,
      status: OBJECTIVE_STATUS.COMPLETE,
    });
  });

  afterAll(async () => {
    await GoalStatusChange.destroy({ where: { id: goalStatusChange.id } });
    await Objective.destroy({ where: { goalId: goal.id }, force: true });
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

    describe('updateObjectiveStatusIfSuspended', () => {
      it('should suspend NOT_STARTED and IN_PROGRESS objectives when goal is suspended', async () => {
        goalStatusChange = await GoalStatusChange.create({
          goalId: goal.id,
          userId: user.id,
          userName: user.name,
          userRoles: ['a', 'b'],
          oldStatus: GOAL_STATUS.IN_PROGRESS,
          newStatus: GOAL_STATUS.SUSPENDED,
          reason: CLOSE_SUSPEND_REASONS[0],
          context: 'Testing',
        });

        await objective1.reload();
        await objective2.reload();
        await objective3.reload();

        expect(objective1.status).toBe(GOAL_STATUS.SUSPENDED);
        expect(objective2.status).toBe(GOAL_STATUS.SUSPENDED);
        expect(objective3.status).toBe(OBJECTIVE_STATUS.COMPLETE); // Should remain unchanged
      });

      it('should not update objectives when status is not changing to suspended', async () => {
        // Reset objectives to original states
        await objective1.update({ status: GOAL_STATUS.NOT_STARTED });
        await objective2.update({ status: GOAL_STATUS.IN_PROGRESS });

        goalStatusChange = await GoalStatusChange.create({
          goalId: goal.id,
          userId: user.id,
          userName: user.name,
          userRoles: ['a', 'b'],
          oldStatus: GOAL_STATUS.NOT_STARTED,
          newStatus: GOAL_STATUS.IN_PROGRESS,
          reason: CLOSE_SUSPEND_REASONS[0],
          context: 'Testing',
        });

        await objective1.reload();
        await objective2.reload();

        expect(objective1.status).toBe(GOAL_STATUS.NOT_STARTED);
        expect(objective2.status).toBe(GOAL_STATUS.IN_PROGRESS);
      });

      it('should not update objectives when oldStatus equals newStatus', async () => {
        // Reset objectives to original states
        await objective1.update({ status: GOAL_STATUS.NOT_STARTED });
        await objective2.update({ status: GOAL_STATUS.IN_PROGRESS });

        goalStatusChange = await GoalStatusChange.create({
          goalId: goal.id,
          userId: user.id,
          userName: user.name,
          userRoles: ['a', 'b'],
          oldStatus: GOAL_STATUS.SUSPENDED,
          newStatus: GOAL_STATUS.SUSPENDED,
          reason: 'Testing no change',
          context: 'Testing',
        });

        await objective1.reload();
        await objective2.reload();

        expect(objective1.status).toBe(GOAL_STATUS.NOT_STARTED);
        expect(objective2.status).toBe(GOAL_STATUS.IN_PROGRESS);
      });
    });
  });
});
