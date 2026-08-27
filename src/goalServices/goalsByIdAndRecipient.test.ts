import { GOAL_STATUS } from '../constants';
import db from '../models';
import { createGoal, createGrant, createRecipient } from '../testUtils';
import { goalRegionIdsByIdAndRecipient } from './goalsByIdAndRecipient';

const { Goal, Grant, Recipient, sequelize } = db;

describe('goalRegionIdsByIdAndRecipient', () => {
  let firstRecipient;
  let secondRecipient;
  let firstGrant;
  let secondGrant;
  let firstGoal;
  let secondGoal;
  let otherRecipientGoal;

  beforeAll(async () => {
    firstRecipient = await createRecipient({});
    secondRecipient = await createRecipient({});

    firstGrant = await createGrant({
      recipientId: firstRecipient.id,
      regionId: 1,
    });

    secondGrant = await createGrant({
      recipientId: firstRecipient.id,
      regionId: 2,
    });

    const otherRecipientGrant = await createGrant({
      recipientId: secondRecipient.id,
      regionId: 3,
    });

    firstGoal = await createGoal({
      grantId: firstGrant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });

    secondGoal = await createGoal({
      grantId: secondGrant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });

    otherRecipientGoal = await createGoal({
      grantId: otherRecipientGrant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });
  });

  afterAll(async () => {
    await Goal.destroy({
      where: {
        id: [firstGoal.id, secondGoal.id, otherRecipientGoal.id],
      },
      force: true,
      individualHooks: true,
    });

    await Grant.destroy({
      where: {
        id: [firstGrant.id, secondGrant.id, otherRecipientGoal.grantId],
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: [firstRecipient.id, secondRecipient.id],
      },
      individualHooks: true,
    });

    await sequelize.close();
  });

  it('returns region ids only for matching goals owned by the requested recipient', async () => {
    const regionIds = await goalRegionIdsByIdAndRecipient(
      [firstGoal.id, secondGoal.id, otherRecipientGoal.id],
      firstRecipient.id
    );

    expect(regionIds.sort()).toEqual([1, 2]);
  });

  it('accepts a single goal id', async () => {
    const regionIds = await goalRegionIdsByIdAndRecipient(firstGoal.id, firstRecipient.id);

    expect(regionIds).toEqual([1]);
  });

  it('returns an empty array without querying when no goal ids are provided', async () => {
    const findAllSpy = jest.spyOn(Goal, 'findAll');

    const regionIds = await goalRegionIdsByIdAndRecipient([], firstRecipient.id);

    expect(regionIds).toEqual([]);
    expect(findAllSpy).not.toHaveBeenCalled();
    findAllSpy.mockRestore();
  });
});
