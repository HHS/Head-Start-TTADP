import httpContext from 'express-http-context'
import { sequelize, isConnectionOpen } from '..'
import { auditLogger } from '../../logger'

jest.mock('express-http-context', () => ({
  get: jest.fn(),
}))

jest.mock('../../logger', () => ({
  auditLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Sequelize Tests', () => {
  beforeAll(() => {
    jest.spyOn(sequelize, 'close').mockResolvedValue()
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  describe('isConnectionOpen', () => {
    it('should return false when there is no pool', () => {
      sequelize.connectionManager.pool = null

      const result = isConnectionOpen()

      expect(result).toBe(false)
    })

    it('should return false when there are no active connections in the pool', () => {
      sequelize.connectionManager.pool = {
        _availableObjects: [],
        _inUseObjects: [],
      }

      const result = isConnectionOpen()

      expect(result).toBe(false)
    })

    it('should return true when there are available objects in the pool', () => {
      sequelize.connectionManager.pool = {
        _availableObjects: [{}],
        _inUseObjects: [],
      }

      const result = isConnectionOpen()

      expect(result).toBe(true)
    })

    it('should return true when there are in-use objects in the pool', () => {
      sequelize.connectionManager.pool = {
        _availableObjects: [],
        _inUseObjects: [{}],
      }

      const result = isConnectionOpen()

      expect(result).toBe(true)
    })
  })
})
