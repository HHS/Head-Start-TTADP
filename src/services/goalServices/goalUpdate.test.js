import faker from '@faker-js/faker';
import {
  updateGoalStatusById,
  verifyAllowedGoalStatusTransition,
} from '../goals';
import {
  Goal,
  Grant,
  Recipient,
  sequelize,
} from '../../models';
import { GOAL_STATUS } from '../../constants';

describe('Change Goal Status', () => {
  let goal;
  let grant;
  let recipient;

  beforeAll(async () => {
    // create recipient
    recipient = await Recipient.create({
      id: faker.datatype.number(),
      name: faker.name.firstName(),
    });

    // create grant
    grant = await Grant.create({
      id: faker.datatype.number(),
      number: faker.datatype.string(),
      recipientId: recipient.id,
      regionId: 1,
    });

    // create goal
    goal = await Goal.create({
      name: 'Goal with Objectives (BUT WHERE ARE THEY?)',
      status: GOAL_STATUS.NOT_STARTED,
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-02'),
      grantId: grant.id,
      previousStatus: null,
    });
  });

  afterAll(async () => {
    // Cleanup Goal.
    await Goal.destroy({
      where: {
        grantId: grant.id,
      },
    });

    // Cleanup Grant.
    await Grant.destroy({
      where: {
        id: grant.id,
      },
    });

    // Cleanup Recipient.
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    await sequelize.close();
  });
  describe('verifyAllowedGoalStatusTransition', () => {
    it('returns false if the goal status change is not allowed', async () => {
    // can't change from not started to in progress
      let result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.NOT_STARTED,
        GOAL_STATUS.IN_PROGRESS,
        [],
      );
      expect(result).toEqual(false);

      // can change from not started to closed
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.NOT_STARTED,
        GOAL_STATUS.CLOSED,
        [],
      );
      expect(result).toEqual(true);

      // can change from not started to suspended
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.NOT_STARTED,
        GOAL_STATUS.SUSPENDED,
        [],
      );
      expect(result).toEqual(true);

      // can't change from draft to not started
      result = verifyAllowedGoalStatusTransition(

        GOAL_STATUS.DRAFT,
        GOAL_STATUS.NOT_STARTED,
        [],
      );
      expect(result).toEqual(false);

      // can't change from draft to in progress
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.DRAFT,
        GOAL_STATUS.IN_PROGRESS,
        [],
      );
      expect(result).toEqual(false);

      // can't change from draft to closed
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.DRAFT,
        GOAL_STATUS.CLOSED,
        [],
      );
      expect(result).toEqual(false);

      // can't change from draft to suspended
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.DRAFT,
        GOAL_STATUS.SUSPENDED,
        [],
      );
      expect(result).toEqual(false);

      // can't change from in progress to not started
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.IN_PROGRESS,
        GOAL_STATUS.NOT_STARTED,
        [],
      );
      expect(result).toEqual(false);

      // can't change from in progress to draft
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.IN_PROGRESS,
        GOAL_STATUS.DRAFT,
        [],
      );
      expect(result).toEqual(false);

      // can change from in progress to closed
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.IN_PROGRESS,
        GOAL_STATUS.CLOSED,
        [],
      );
      expect(result).toEqual(true);

      // can change from in progress to suspended
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.IN_PROGRESS,
        GOAL_STATUS.SUSPENDED,
        [],
      );

      // can't change from suspended to not started
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.NOT_STARTED,
        [],
      );
      expect(result).toEqual(false);

      // cant change from suspended to draft
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.DRAFT,
        [],
      );
      expect(result).toEqual(false);

      // can't change from suspended to in progress
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.IN_PROGRESS,
        [],
      );

      expect(result).toEqual(false);

      // can change from suspended to closed
      result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.CLOSED,
        [],
      );
      expect(result).toEqual(true);
    });

    it('queries the previous status when the old status is suspended', async () => {
      // can't change from suspended to in progress
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.IN_PROGRESS,
        [GOAL_STATUS.IN_PROGRESS],
      );

      expect(result).toEqual(true);
    });
  });

  it('Updates goal status with reason', async () => {
    const newStatus = GOAL_STATUS.CLOSED;
    const oldStatus = GOAL_STATUS.IN_PROGRESS;
    const reason = 'TTA complete';
    const context = 'This goal has been completed.';
    const updatedGoals = await updateGoalStatusById(
      goal.id.toString(),
      oldStatus,
      newStatus,
      reason,
      context,
      [],
    );

    expect(updatedGoals.length).toEqual(1);
    const updatedGoal = updatedGoals[0];
    expect(updatedGoal.status).toEqual(newStatus);
    expect(updatedGoal.closeSuspendReason).toEqual(reason);
    expect(updatedGoal.closeSuspendContext).toEqual(context);
    expect(updatedGoal.previousStatus).toEqual(oldStatus);
  });
});
