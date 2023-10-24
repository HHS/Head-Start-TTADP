import httpCodes from 'http-codes';
import { getCuratedGoalOptions } from './goal';
import { getCuratedTemplates } from '../../services/goalTemplates';

jest.mock('../../services/goalTemplates', () => ({
  getCuratedTemplates: jest.fn(),
}));

describe('goal router', () => {
  const json = jest.fn();
  const mockResponse = {
    attachment: jest.fn(),
    json,
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
      json,
    })),
  };

  const mockRequest = {
    session: {
      userId: 1,
    },
    query: {},
  };

  afterEach(() => jest.clearAllMocks());

  describe('getCuratedGoalOptions', () => {
    it('returns the curated goal options', async () => {
      const goals = [{ id: 1 }, { id: 2 }];
      getCuratedTemplates.mockResolvedValueOnce(goals);

      await getCuratedGoalOptions(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK);
      expect(json).toHaveBeenCalledWith(goals);
    });

    it('handles errors', async () => {
      getCuratedTemplates.mockRejectedValueOnce(new Error('Failed to get curated goals'));
      await getCuratedGoalOptions(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
