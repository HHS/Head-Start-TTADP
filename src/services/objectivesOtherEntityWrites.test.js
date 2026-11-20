import db from '../models';
import { saveObjectivesForReport } from './objectives';

jest.mock('bull');

const { Objective } = db;

describe('saveObjectivesForReport other entity lookups', () => {
  afterEach(() => jest.restoreAllMocks());

  const objective = {
    title: 'other entity objective',
    status: 'Not Started',
    isNew: true,
    ids: [10],
    recipientIds: [1],
    topics: [],
    files: [],
    resources: [],
  };

  it('only matches objectives without a goal when looking up by id and by title', async () => {
    const findOne = jest.spyOn(Objective, 'findOne').mockResolvedValue(null);
    jest.spyOn(Objective, 'create').mockRejectedValue(new Error('stop after lookups'));

    await expect(saveObjectivesForReport([objective], { id: 1 })).rejects.toThrow(
      'stop after lookups'
    );

    expect(findOne).toHaveBeenCalledTimes(2);
    expect(findOne.mock.calls[0][0].where).toMatchObject({ id: [10], goalId: null });
    expect(findOne.mock.calls[1][0].where).toMatchObject({
      title: objective.title,
      goalId: null,
    });
  });

  it('never creates an objective attached to a supplied goal', async () => {
    jest.spyOn(Objective, 'findOne').mockResolvedValue(null);
    const create = jest
      .spyOn(Objective, 'create')
      .mockRejectedValue(new Error('stop after create'));

    await expect(
      saveObjectivesForReport([{ ...objective, goalId: 999 }], { id: 1 })
    ).rejects.toThrow('stop after create');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: null, otherEntityId: 1 })
    );
  });

  it('does not update a matched objective that belongs to a goal', async () => {
    const update = jest.fn();
    jest.spyOn(Objective, 'findOne').mockImplementation(async ({ where }) => {
      // Simulates the database: the only stored match is a grant backed objective.
      const goalBacked = { goalId: 55, update };
      return where.goalId === null ? null : goalBacked;
    });
    jest.spyOn(Objective, 'create').mockRejectedValue(new Error('stop after create'));

    await expect(saveObjectivesForReport([objective], { id: 1 })).rejects.toThrow(
      'stop after create'
    );
    expect(update).not.toHaveBeenCalled();
  });
});
