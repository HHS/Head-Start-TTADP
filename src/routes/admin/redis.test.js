import { getRedisInfo, flushRedis } from './redis'

const mockInfo = jest.fn(() => Promise.resolve(''))
const mockFlushall = jest.fn(() => Promise.resolve('OK'))

jest.mock('../../lib/redisClient', () => ({
  __esModule: true,
  getRedis: jest.fn(() => ({
    info: mockInfo,
    flushall: mockFlushall,
  })),
}))

jest.mock('../../lib/apiErrorHandler', () => ({
  handleError: jest.fn(),
}))

jest.mock('../../lib/queue', () => ({
  __esModule: true,
  default: jest.fn(),
  generateRedisConfig: jest.fn(() => ({
    uri: 'redis://localhost:6379',
    tlsEnabled: false,
  })),
}))

describe('redis', () => {
  const json = jest.fn()

  const mockResponse = {
    attachment: jest.fn(),
    json,
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => mockResponse),
    end: jest.fn(),
  }

  const mockRequest = {
    session: {
      userId: 1,
    },
    query: {},
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockInfo.mockResolvedValue('')
    mockFlushall.mockResolvedValue('')

    // eslint-disable-next-line @typescript-eslint/no-shadow, global-require
    const { handleError } = require('../../lib/apiErrorHandler')
    handleError.mockImplementation(() => {})
  })

  describe('getRedisInfo', () => {
    it('returns the redis info', async () => {
      mockResponse.status.mockReturnValue(mockResponse)

      await getRedisInfo(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(json).toHaveBeenCalledWith({ info: '' })
    })

    it('handles errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-shadow, global-require
      const { handleError } = require('../../lib/apiErrorHandler')
      mockInfo.mockRejectedValueOnce(new Error('error'))

      await getRedisInfo(mockRequest, mockResponse)

      expect(handleError).toHaveBeenCalled()
    })
  })

  describe('flushRedis', () => {
    it('flushes redis', async () => {
      mockResponse.status.mockReturnValue(mockResponse)

      await flushRedis(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
    })

    it('handles errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-shadow, global-require
      const { handleError } = require('../../lib/apiErrorHandler')
      mockFlushall.mockRejectedValueOnce(new Error('error'))

      await flushRedis(mockRequest, mockResponse)

      expect(handleError).toHaveBeenCalled()
    })
  })
})
