import Semaphore from '../../lib/semaphore'

import { syncLink, syncGrantNumberLink } from './genericLink'

describe('syncLink', () => {
  const sequelize = {}
  const instance = {}
  instance.changed = jest.fn().mockReturnValue(['sourceEntity'])
  const options = { transactions: {} }
  const model = {}
  const sourceEntityName = 'sourceEntity'
  const targetEntityName = 'targetEntity'

  const entityId = 'entityId'
  const onCreateCallbackWhileHoldingLock = jest.fn().mockResolvedValue(true)
  const acquireMock = jest.spyOn(Semaphore.prototype, 'acquire')
  const releaseMock = jest.spyOn(Semaphore.prototype, 'release')
  acquireMock.mockImplementation(() => {})
  releaseMock.mockImplementation(() => {})

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should acquire and release a semaphore lock', async () => {
    model.findAll = jest.fn().mockResolvedValueOnce([{}])

    await syncLink(sequelize, instance, options, model, sourceEntityName, targetEntityName, entityId, onCreateCallbackWhileHoldingLock)

    expect(acquireMock).toHaveBeenCalledWith(`${model.tableName}_${entityId}`)
    expect(releaseMock).toHaveBeenCalledWith(`${model.tableName}_${entityId}`)
  })

  it('should create a new record if one does not exist', async () => {
    model.findAll = jest.fn().mockResolvedValueOnce([null])
    model.create = jest.fn().mockResolvedValueOnce([{}])

    await syncLink(sequelize, instance, options, model, sourceEntityName, targetEntityName, entityId, onCreateCallbackWhileHoldingLock)

    expect(model.create).toHaveBeenCalledWith({ [targetEntityName]: entityId }, { transaction: options.transaction })
  })

  it('should call onCreateCallbackWhileHoldingLock if a new record is created', async () => {
    model.findAll = jest.fn().mockResolvedValueOnce([null])
    model.create = jest.fn().mockResolvedValueOnce([{}])

    await syncLink(sequelize, instance, options, model, sourceEntityName, targetEntityName, entityId, onCreateCallbackWhileHoldingLock)

    expect(onCreateCallbackWhileHoldingLock).toHaveBeenCalledWith(sequelize, instance, options, model, targetEntityName, entityId)
  })

  it('should not create a new record if one exists', async () => {
    model.findAll = jest.fn().mockResolvedValueOnce([{}])
    model.create = jest.fn().mockResolvedValueOnce([{}])

    await syncLink(sequelize, instance, options, model, sourceEntityName, targetEntityName, entityId, onCreateCallbackWhileHoldingLock)

    expect(model.create).not.toHaveBeenCalled()
  })

  // Add more tests to cover error handling, different scenarios, etc.
})

describe('syncGrantNumberLink', () => {
  // Add tests for syncGrantNumberLink
  it('should successfully synchronize a grant number link with the associated GrantNumberLink model', async () => {
    const sequelize = {
      models: {
        GrantNumberLink: {
          findAll: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
        Grant: {
          findOne: jest.fn().mockResolvedValue({ grantId: 1 }),
        },
      },
    }
    const instance = {
      isNewRecord: false,
      changed: jest.fn().mockReturnValue(['grantNumber']),
      grantNumber: '12345',
    }
    const options = {
      transaction: {},
    }

    await syncGrantNumberLink(sequelize, instance, options)

    expect(sequelize.models.GrantNumberLink.findAll).toHaveBeenCalledWith({
      attributes: ['grantNumber'],
      where: { grantNumber: '12345' },
      transaction: options.transaction,
    })
    expect(sequelize.models.GrantNumberLink.create).toHaveBeenCalled()
    expect(sequelize.models.Grant.findOne).toHaveBeenCalledWith({
      attributes: [['id', 'grantId']],
      where: { number: '12345' },
      transaction: options.transaction,
      raw: true,
    })
    expect(sequelize.models.GrantNumberLink.update).toHaveBeenCalledWith(
      { grantId: 1 },
      {
        where: { grantNumber: '12345' },
        transaction: options.transaction,
        individualHooks: true,
      }
    )
  })

  it('should synchronize if instance is a new record', async () => {
    const sequelize = {
      models: {
        GrantNumberLink: {
          findAll: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn(),
        },
        Grant: {
          findOne: jest.fn().mockResolvedValue({ id: 1 }),
        },
      },
    }
    const instance = {
      isNewRecord: true,
      changed: jest.fn(),
      grantNumber: '12345',
    }
    const options = {
      transaction: {},
    }

    await syncGrantNumberLink(sequelize, instance, options)

    expect(sequelize.models.GrantNumberLink.create).toHaveBeenCalledTimes(1)
    expect(sequelize.models.Grant.findOne).toHaveBeenCalledWith({
      attributes: [['id', 'grantId']],
      where: { number: '12345' },
      transaction: options.transaction,
      raw: true,
    })
    expect(sequelize.models.GrantNumberLink.update).toHaveBeenCalled()
  })
})

describe('syncMonitoringReviewLink', () => {
  // Add tests for syncMonitoringReviewLink
})

describe('syncMonitoringReviewStatusLink', () => {
  // Add tests for syncMonitoringReviewStatusLink
})

// Note: The above tests are basic and should be expanded to cover more scenarios,
// including error handling and edge cases.
