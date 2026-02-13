const { MAINTENANCE_CATEGORY } = require('../../constants')
const { nextBlock } = require('./db')
const { MaintenanceLog } = require('../../models')

jest.mock('../../models', () => ({
  MaintenanceLog: {
    findOne: jest.fn(),
  },
  sequelize: {
    models: { Goals: {}, Users: {} },
  },
}))

describe('nextBlock', () => {
  const numOfModels = 2

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should return the default offset and limit when no log is found', async () => {
    MaintenanceLog.findOne.mockResolvedValueOnce(null)

    const result = await nextBlock('type')

    expect(result).toEqual({
      offset: 0,
      limit: numOfModels,
    })
    expect(MaintenanceLog.findOne).toHaveBeenCalledWith({
      where: {
        category: MAINTENANCE_CATEGORY.DB,
        type: 'type',
        isSuccessful: true,
      },
      order: [['id', 'DESC']],
      raw: true,
    })
  })

  test('should use default offset and limit when log data is undefined', async () => {
    MaintenanceLog.findOne.mockResolvedValueOnce({ data: {} })

    const result = await nextBlock('type')

    expect(result).toEqual({
      offset: 0,
      limit: numOfModels,
    })
    expect(MaintenanceLog.findOne).toHaveBeenCalledWith({
      where: {
        category: MAINTENANCE_CATEGORY.DB,
        type: 'type',
        isSuccessful: true,
      },
      order: [['id', 'DESC']],
      raw: true,
    })
  })

  test('should calculate newOffset correctly when offset + limit is less than numOfModels', async () => {
    MaintenanceLog.findOne.mockResolvedValueOnce({
      data: { offset: 0, limit: 1 },
    })

    const result = await nextBlock('type')

    expect(result).toEqual({
      offset: 1,
      limit: 1,
    })
    expect(MaintenanceLog.findOne).toHaveBeenCalledWith({
      where: {
        category: MAINTENANCE_CATEGORY.DB,
        type: 'type',
        isSuccessful: true,
      },
      order: [['id', 'DESC']],
      raw: true,
    })
  })

  test('should calculate newLimit correctly when percent is not null', async () => {
    MaintenanceLog.findOne.mockResolvedValueOnce({
      data: { offset: 0, limit: 1 },
    })

    const percent = 0.5 // 50% of numOfModels
    const result = await nextBlock('type', percent)

    expect(result).toEqual({
      offset: 1,
      limit: Math.floor(numOfModels * percent),
    })
    expect(MaintenanceLog.findOne).toHaveBeenCalledWith({
      where: {
        category: MAINTENANCE_CATEGORY.DB,
        type: 'type',
        isSuccessful: true,
      },
      order: [['id', 'DESC']],
      raw: true,
    })
  })
})
