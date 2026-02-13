import httpCodes from 'http-codes'
import { getGroupsByRegion } from './group'
import { groupsByRegion } from '../../services/groups'

jest.mock('../../services/groups', () => ({
  groupsByRegion: jest.fn(),
}))

describe('group router', () => {
  const json = jest.fn()
  const mockResponse = {
    attachment: jest.fn(),
    json,
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
      json,
    })),
  }

  const mockRequest = {
    session: {
      userId: 1,
    },
    query: {},
  }

  afterEach(() => jest.clearAllMocks())

  describe('getGroupsByRegion', () => {
    it('returns the groups by region', async () => {
      const groups = [{ id: 1 }, { id: 2 }]
      groupsByRegion.mockResolvedValueOnce(groups)

      const req = {
        ...mockRequest,
        params: {
          regionId: 1,
        },
      }

      await getGroupsByRegion(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK)
      expect(json).toHaveBeenCalledWith(groups)
    })

    it('handles a lack of region id', async () => {
      const req = {
        ...mockRequest,
        params: {
          regionId: null,
        },
      }

      await getGroupsByRegion(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST)
    })

    it('handles errors', async () => {
      groupsByRegion.mockRejectedValueOnce(new Error('Failed to get groups by region'))

      const req = {
        ...mockRequest,
        params: {
          regionId: 1,
        },
      }

      await getGroupsByRegion(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR)
    })
  })
})
