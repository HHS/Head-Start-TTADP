import { Op } from 'sequelize';
import syncJoinRows from './syncJoinRows';

const mockModel = (existingIds: (number | string)[]) => ({
  findAll: jest
    .fn()
    .mockResolvedValue(
      existingIds.map((id) => ({ get: (key: string) => (key === 'childId' ? id : undefined) }))
    ),
  bulkCreate: jest.fn().mockResolvedValue([]),
  destroy: jest.fn().mockResolvedValue(0),
});

const sync = (model: ReturnType<typeof mockModel>, childIds: (number | string)[]) =>
  syncJoinRows(model as never, { parentId: 1 }, 'childId', childIds);

describe('syncJoinRows', () => {
  it('looks up only the rows for the parent', async () => {
    const model = mockModel([]);
    await sync(model, [2]);

    expect(model.findAll).toHaveBeenCalledWith({
      attributes: ['childId'],
      where: { parentId: 1 },
    });
  });

  it('creates the missing rows and destroys the ones no longer listed', async () => {
    const model = mockModel([2, 3]);
    await sync(model, [3, 4]);

    expect(model.bulkCreate).toHaveBeenCalledWith([{ parentId: 1, childId: 4 }]);
    expect(model.destroy).toHaveBeenCalledWith({
      where: { parentId: 1, childId: { [Op.notIn]: [3, 4] } },
    });
  });

  it('creates a repeated id only once', async () => {
    const model = mockModel([]);
    await sync(model, ['a', 'a']);

    expect(model.bulkCreate).toHaveBeenCalledWith([{ parentId: 1, childId: 'a' }]);
  });

  it('destroys every row for the parent when given an empty list', async () => {
    const model = mockModel([2]);
    await sync(model, []);

    expect(model.bulkCreate).toHaveBeenCalledWith([]);
    expect(model.destroy).toHaveBeenCalledWith({
      where: { parentId: 1, childId: { [Op.notIn]: [] } },
    });
  });
});
