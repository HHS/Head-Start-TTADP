import httpCodes from 'http-codes'
import { getHandler } from './handlers'
import db from '../../models'
import { findAll } from '../../services/nationalCenters'
import { findAllUsersWithScope } from '../../services/users'

jest.mock('../../services/nationalCenters', () => ({
  findAll: jest.fn(),
}))

jest.mock('../../services/users', () => ({
  findAllUsersWithScope: jest.fn(),
}))

describe('nationalCenter route', () => {
  afterAll(() => db.sequelize.close())
  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
      json: jest.fn(),
    })),
  }

  const mockRequest = {
    session: {
      userId: 1,
    },
    query: {},
  }

  describe('getHandler', () => {
    it('successfully gets all nationalCenters', async () => {
      const nationalCenters = [
        { id: 1, name: 'National Center 1' },
        { id: 2, name: 'National Center 2' },
      ]
      findAll.mockResolvedValueOnce(nationalCenters)
      findAllUsersWithScope.mockResolvedValueOnce([])

      await getHandler(mockRequest, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK)
    })

    it('handles failures', async () => {
      findAll.mockRejectedValueOnce(new Error('Failed to get nationalCenters'))

      await getHandler(mockRequest, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR)
    })
  })
})
