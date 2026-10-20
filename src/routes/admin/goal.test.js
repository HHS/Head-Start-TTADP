import httpCodes from 'http-codes';
import {
  closeMultiRecipientGoalsFromAdmin,
  createMultiRecipientGoalsFromAdmin,
} from '../../goalServices/goals';
import { GoalStatusChangeBlockedError } from '../../goalServices/validateGoalStatusChange';
import { getCuratedTemplates } from '../../services/goalTemplates';
import { closeGoalsFromAdmin, createGoalsFromAdmin, getCuratedGoalOptions } from './goal';

jest.mock('../../services/goalTemplates', () => ({
  getCuratedTemplates: jest.fn(),
}));

jest.mock('../../goalServices/goals', () => ({
  createMultiRecipientGoalsFromAdmin: jest.fn(),
  closeMultiRecipientGoalsFromAdmin: jest.fn(),
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

  describe('closeGoalsFromAdmin', () => {
    it('returns the closed goal data', async () => {
      const goals = [{ id: 1 }, { id: 2 }];
      closeMultiRecipientGoalsFromAdmin.mockResolvedValueOnce(goals);

      await closeGoalsFromAdmin(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK);
      expect(json).toHaveBeenCalledWith(goals);
    });

    it('handles errors', async () => {
      closeMultiRecipientGoalsFromAdmin.mockRejectedValueOnce(new Error('Failed to close goals'));
      await closeGoalsFromAdmin(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('returns conflict details when closing is blocked', async () => {
      closeMultiRecipientGoalsFromAdmin.mockRejectedValueOnce(
        new GoalStatusChangeBlockedError(['ACTIVE_ACTIVITY_REPORT'])
      );

      await closeGoalsFromAdmin(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.CONFLICT);
      expect(json).toHaveBeenCalledWith({
        code: 'GOAL_STATUS_CHANGE_BLOCKED',
        reasons: ['ACTIVE_ACTIVITY_REPORT'],
      });
    });
  });

  describe('createGoalsFromAdmin', () => {
    it('returns the created goal data', async () => {
      const goals = [{ id: 1 }, { id: 2 }];
      createMultiRecipientGoalsFromAdmin.mockResolvedValueOnce(goals);

      await createGoalsFromAdmin(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK);
      expect(json).toHaveBeenCalledWith(goals);
    });

    it('handles errors', async () => {
      createMultiRecipientGoalsFromAdmin.mockRejectedValueOnce(new Error('Failed to create goals'));
      await createGoalsFromAdmin(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
