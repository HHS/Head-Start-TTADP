import {
  CURRENT_GOAL_SIMILARITY_VERSION,
  CREATION_METHOD,
  GOAL_STATUS,
} from '../constants';
import {
  Recipient,
  Goal,
  GoalSimilarityGroup,
  GoalSimilarityGroupGoal,
  Grant,
  sequelize,
} from '../models';
import {
  createGoal,
  createGrant,
  createRecipient,
} from '../testUtils';
import {
  getSimilarityGroupsByRecipientId,
  getSimilarityGroupByContainingGoalIds,
  setSimilarityGroupAsUserInvalidated,
  setSimilarityGroupAsUserMerged,
  createSimilarityGroup,
  deleteSimilarityGroup,
  flattenSimilarityGroupGoals,
  getSimilarityGroupById,
} from './goalSimilarityGroup';

describe('goalSimilarityGroup services', () => {
  let recipient;
  let grant;
  let grant2;
  let goal1;
  let goal2;
  let goal3;
  let goal4;
  let goal5;
  let goal6;
  let group;

  beforeAll(async () => {
    recipient = await createRecipient();
    grant = await createGrant({ recipientId: recipient.id });
    grant2 = await createGrant({ recipientId: recipient.id, regionId: 2 });
    goal1 = await createGoal({ grantId: grant.id, status: 'In Progress' });
    goal2 = await createGoal({ grantId: grant.id, status: 'In Progress' });
    goal3 = await createGoal({ grantId: grant.id, status: 'In Progress' });
    goal4 = await createGoal({ grantId: grant.id, status: 'In Progress' });
    goal5 = await createGoal({ grantId: grant.id, status: 'In Progress' });
    goal6 = await createGoal({ grantId: grant.id, status: 'In Progress' });
    goal6 = await createGoal({ grantId: grant2.id, status: 'In Progress' });

    group = await GoalSimilarityGroup.create({
      recipientId: recipient.id,
      version: CURRENT_GOAL_SIMILARITY_VERSION,
    });

    await GoalSimilarityGroupGoal.bulkCreate([
      { goalSimilarityGroupId: group.id, goalId: goal1.id },
      { goalSimilarityGroupId: group.id, goalId: goal2.id },
      { goalSimilarityGroupId: group.id, goalId: goal3.id },
      { goalSimilarityGroupId: group.id, goalId: goal6.id },
    ]);
  });

  afterAll(async () => {
    const groups = await GoalSimilarityGroup.findAll({ where: { recipientId: recipient.id } });
    const groupIds = groups.map((g) => g.id);

    await GoalSimilarityGroupGoal.destroy({ where: { goalSimilarityGroupId: groupIds } });
    await GoalSimilarityGroup.destroy({ where: { recipientId: recipient.id } });
    await Goal.destroy({
      where: {
        grantId: [grant.id, grant2.id],
      },
      force: true,
      paranoid: true,
      individualHooks: true,
    });
    await Grant.destroy({ where: { recipientId: recipient.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
    await sequelize.close();
  });

  test('getSimilarityGroupByContainingGoalIds', async () => {
    const g = await getSimilarityGroupByContainingGoalIds(
      [goal1.id, goal2.id, goal3.id, goal6.id],
      { recipientId: recipient.id },
    );
    expect(g.goals.sort()).toEqual([goal1.id, goal2.id, goal3.id, goal6.id].sort());
  });

  test('getSimilarityGroupById', async () => {
    const groupById = await getSimilarityGroupById(group.id);
    expect(groupById.goals.sort()).toEqual([goal1.id, goal2.id, goal3.id, goal6.id].sort());
  });

  test('getSimilarityGroupById with region', async () => {
    const groupById = await getSimilarityGroupById(group.id, {}, grant.regionId);
    expect(groupById.goals.sort()).toEqual([goal1.id, goal2.id, goal3.id].sort());
  });

  test('getSimilarityGroupsByRecipientId', async () => {
    const groups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(groups.length).toBe(1);
    expect(groups[0].goals.sort()).toEqual([goal1.id, goal2.id, goal3.id, goal6.id].sort());
  });

  test('getSimilarityGroupsByRecipientId with region', async () => {
    const groups = await getSimilarityGroupsByRecipientId(
      recipient.id,
      {},
      false,
      grant2.regionId,
    );
    expect(groups.length).toBe(1);
    expect(groups[0].goals.sort()).toEqual([goal6.id].sort());
  });

  test('setSimilarityGroupAsUserInvalidated', async () => {
    const groups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(groups.length).toBe(1);
    expect(groups[0].userHasInvalidated).toBeFalsy();

    await setSimilarityGroupAsUserInvalidated(groups[0].id);

    const updatedGroups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(updatedGroups.length).toBe(1);
    expect(updatedGroups[0].userHasInvalidated).toBe(true);
  });

  test('setSimilarityGroupAsUserMerged', async () => {
    const groups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(groups.length).toBe(1);
    expect(groups[0].finalGoalId).toBe(null);

    await setSimilarityGroupAsUserMerged(groups[0].id, 1);

    const updatedGroups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(updatedGroups.length).toBe(1);
    expect(updatedGroups[0].finalGoalId).toBe(1);
  });

  test('createSimilarityGroup & deleteSimilarityGroup', async () => {
    const goals = [
      {
        excludedIfNotAdmin: false,
        ids: [goal4.id, goal5.id, goal6.id],
      },
    ];
    const newGroup = await createSimilarityGroup(recipient.id, goals);
    const groups = await getSimilarityGroupsByRecipientId(recipient.id);

    expect(groups.length).toBe(2);

    await deleteSimilarityGroup(newGroup.id);
    const updatedGroups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(updatedGroups.length).toBe(1);
  });

  describe('flattenSimilarityGroupGoals', () => {
    it('should flatten similarity group goals', () => {
      const g = {
        toJSON: jest.fn().mockReturnValue({ id: 'group-id' }),
        goals: [
          { id: 'goal-1', goalTemplate: { creationMethod: CREATION_METHOD.CURATED }, status: GOAL_STATUS.IN_PROGRESS },
          { id: 'goal-2', goalTemplate: { creationMethod: CREATION_METHOD.CURATED }, status: GOAL_STATUS.CLOSED },
          { id: 'goal-3', goalTemplate: { creationMethod: CREATION_METHOD.AUTOMATIC }, status: GOAL_STATUS.IN_PROGRESS },
          { id: 'goal-4', status: GOAL_STATUS.IN_PROGRESS },
        ],
      };

      const result = flattenSimilarityGroupGoals(g);

      expect(result).toEqual({
        id: 'group-id',
        goals: ['goal-1', 'goal-2', 'goal-3', 'goal-4'],
      });
    });
  });
});
