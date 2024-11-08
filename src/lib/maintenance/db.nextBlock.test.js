const { MAINTENANCE_CATEGORY } = require('../../constants');
const {
  nextBlock,
} = require('./db');
const { MaintenanceLog } = require('../../models');

jest.mock('../../models', () => ({
  MaintenanceLog: {
    findOne: jest.fn(),
  },
  sequelize: {
    models: { Goals: {}, Users: {} },
  },
}));

describe('nextBlock', () => {
  const numOfModels = 2;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return the default offset and limit when no log is found', async () => {
    MaintenanceLog.findOne.mockResolvedValueOnce(null);

    const result = await nextBlock('type');

    expect(result).toEqual({
      offset: 0,
      limit: numOfModels,
    });
    expect(MaintenanceLog.findOne).toHaveBeenCalledWith({
      where: {
        category: MAINTENANCE_CATEGORY.DB,
        type: 'type',
        isSuccessful: true,
      },
      order: [['id', 'DESC']],
      raw: true,
    });
  });
});
