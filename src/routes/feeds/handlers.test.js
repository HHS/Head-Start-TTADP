import { whatsNewFeedHandler, singleFeedByTagHandler } from './handlers'
import { getWhatsNewFeedData, getSingleFeedData } from '../../services/feed'

jest.mock('../../services/feed', () => ({
  getWhatsNewFeedData: jest.fn(),
  getSingleFeedData: jest.fn(),
}))

describe('whatsNewFeedHandler', () => {
  const mockRequest = {}
  const mockResponse = {
    send: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  }

  it('returns the feed', async () => {
    const feed = 'GIBBLY GIBBLY'
    getWhatsNewFeedData.mockResolvedValue(feed)
    await whatsNewFeedHandler(mockRequest, mockResponse)
    expect(mockResponse.send).toHaveBeenCalledWith(feed)
  })

  it('handles errors', async () => {
    getWhatsNewFeedData.mockRejectedValue(new Error('error'))
    await whatsNewFeedHandler(mockRequest, mockResponse)
    expect(mockResponse.status).toHaveBeenCalledWith(500)
  })
})

describe('singleFeedByTagHandler', () => {
  const mockRequest = {
    query: {
      tag: 'Single',
    },
  }
  const mockResponse = {
    send: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  }

  it('returns the feed', async () => {
    const feed = 'GIBBLY GIBBLY'
    getSingleFeedData.mockResolvedValue(feed)
    await singleFeedByTagHandler(mockRequest, mockResponse)
    expect(mockResponse.send).toHaveBeenCalledWith(feed)
  })

  it('handles errors', async () => {
    getSingleFeedData.mockRejectedValue(new Error('error'))
    await singleFeedByTagHandler(mockRequest, mockResponse)
    expect(mockResponse.status).toHaveBeenCalledWith(500)
  })
})
