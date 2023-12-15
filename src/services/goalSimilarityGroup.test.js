import { Recipient, GoalSimilarityGroup, sequelize } from '../models';
import { createRecipient } from '../testUtils';
import {
  getSimilarityGroupsByRecipientId,
  getSimilarityGroupsContainingGoalId,
  getSimilarityGroupByContainingGoalIds,
  setSimilarityGroupAsUserInvalidated,
  setSimilarityGroupAsUserMerged,
  createSimilarityGroup,
  deleteSimilarityGroup,
} from './goalSimilarityGroup';

describe('goalSimilarityGroup services', () => {
  let recipient;

  beforeAll(async () => {
    recipient = await createRecipient();

    await GoalSimilarityGroup.create({
      recipientId: recipient.id,
      goals: [1, 2, 3],
    });
  });

  afterAll(async () => {
    await GoalSimilarityGroup.destroy({ where: { recipientId: recipient.id } });
    await Recipient.destroy({ where: { id: recipient.id } });
    await sequelize.close();
  });

  test('getSimilarityGroupsContainingGoalId', async () => {
    const groups = await getSimilarityGroupsContainingGoalId(2);
    expect(groups.length).toBe(1);
    expect(groups[0].goals).toEqual([1, 2, 3]);
  });

  test('getSimilarityGroupByContainingGoalIds', async () => {
    const group = await getSimilarityGroupByContainingGoalIds(
      [1, 2, 3],
      { recipientId: recipient.id },
    );
    expect(group.goals).toEqual([1, 2, 3]);
  });

  test('getSimilarityGroupsByRecipientId', async () => {
    const groups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(groups.length).toBe(1);
    expect(groups[0].goals).toEqual([1, 2, 3]);
  });

  test('setSimilarityGroupAsUserInvalidated', async () => {
    const groups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(groups.length).toBe(1);
    expect(groups[0].userHasInvalidated).toBe(false);

    await setSimilarityGroupAsUserInvalidated(groups[0].id);

    const updatedGroups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(updatedGroups.length).toBe(1);
    expect(updatedGroups[0].userHasInvalidated).toBe(true);
  });

  test('setSimilarityGroupAsUserMerged', async () => {
    const groups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(groups.length).toBe(1);
    expect(groups[0].finalGoalId).toBe(null);

    await setSimilarityGroupAsUserMerged(groups[0].id, 1, [1, 2, 3]);

    const updatedGroups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(updatedGroups.length).toBe(1);
    expect(updatedGroups[0].finalGoalId).toBe(1);
  });

  test('createSimilarityGroup & deleteSimilarityGroup', async () => {
    const newGroup = await createSimilarityGroup(recipient.id, [4, 5, 6]);
    const groups = await getSimilarityGroupsByRecipientId(recipient.id);

    expect(groups.length).toBe(2);

    await deleteSimilarityGroup(newGroup.id);
    const updatedGroups = await getSimilarityGroupsByRecipientId(recipient.id);
    expect(updatedGroups.length).toBe(1);
  });
});
