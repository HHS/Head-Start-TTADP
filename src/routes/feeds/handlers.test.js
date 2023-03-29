import { whatsNewFeedHandler } from './handlers';
import { getWhatsNewFeedData } from '../../services/feed';

jest.mock('../../services/feed', () => ({
  getWhatsNewFeedData: jest.fn(),
}));

describe('whatsNewFeedHandler', () => {
  const mockRequest = {};
  const mockResponse = {
    send: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };

  it('returns the feed', async () => {
    const feed = 'GIBBLY GIBBLY';
    getWhatsNewFeedData.mockResolvedValue(feed);
    await whatsNewFeedHandler(mockRequest, mockResponse);
    expect(mockResponse.send).toHaveBeenCalledWith(feed);
  });

  it('handles errors', async () => {
    getWhatsNewFeedData.mockRejectedValue(new Error('error'));
    await whatsNewFeedHandler(mockRequest, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });
});
