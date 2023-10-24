import { filterDataToModel } from '../../../lib/modelUtils';
import db from '../../../models';
import { syncGoals } from '../goal';
import { syncGoalFieldResponses } from '../goalFieldResponse';
import { syncGoalResources } from '../goalResource';
import { syncObjectives } from '../objective';

jest.mock('../goalResource');
jest.mock('../goalFieldResponse');
jest.mock('../objective');
jest.mock('../../../lib/modelUtils');
jest.mock('../../../models', () => {
  const originalModule = jest.requireActual('../../../models');
  return {
    ...originalModule,
    db: {
      ...originalModule.db,
      Goal: {
        findAll: jest.fn(() => []),
        update: jest.fn(() => []),
      },
    },
  };
});

describe('syncGoals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    await db.isReady;
  });

  it('should call filterDataToModel for each datum in data', async () => {
    const data = [{ grantId: 1 }, { grantId: 2 }];
    await syncGoals(data);

    expect(filterDataToModel).toHaveBeenCalledTimes(2);
    expect(filterDataToModel).toHaveBeenCalledWith({ grantId: 1 }, db.Goal);
    expect(filterDataToModel).toHaveBeenCalledWith({ grantId: 2 }, db.Goal);
  });

  it('should not call syncGoalResources if goalResourcesList is empty', async () => {
    filterDataToModel.mockResolvedValueOnce({
      mapped: { id: 1, unmapped: { goalResources: [] } },
    });

    await syncGoals([]);

    expect(syncGoalResources).toHaveBeenCalledTimes(0);
  });

  it('should not call syncGoalFieldResponses if goalFieldResponsesList is empty', async () => {
    filterDataToModel.mockResolvedValueOnce({
      mapped: { id: 1, unmapped: { goalFieldResponses: [] } },
    });

    await syncGoals([]);

    expect(syncGoalFieldResponses).toHaveBeenCalledTimes(0);
  });

  it('should not call syncObjectives if objectives is empty', async () => {
    filterDataToModel.mockResolvedValueOnce({
      mapped: { id: 1, unmapped: { objectives: [] } },
    });

    await syncGoals([]);

    expect(syncObjectives).toHaveBeenCalledTimes(0);
  });
});
