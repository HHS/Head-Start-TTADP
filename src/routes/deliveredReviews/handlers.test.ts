import type { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import * as deliveredReviewsService from '../../services/deliveredReviews';
import { getCitationReviewTypes } from './handlers';

jest.mock('../../services/deliveredReviews');
jest.mock('../../lib/apiErrorHandler');

describe('deliveredReviews handlers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockRequest = {};
    mockResponse = { json: mockJson };
    jest.clearAllMocks();
  });

  describe('getCitationReviewTypes', () => {
    it('returns review types as JSON', async () => {
      const mockTypes = ['Annual', 'Follow-up', 'Special'];
      (deliveredReviewsService.getCitationReviewTypes as jest.Mock).mockResolvedValue(mockTypes);

      await getCitationReviewTypes(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(mockTypes);
    });

    it('calls handleErrors when service throws', async () => {
      const error = new Error('DB error');
      (deliveredReviewsService.getCitationReviewTypes as jest.Mock).mockRejectedValue(error);

      await getCitationReviewTypes(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'HANDLERS:DELIVERED_REVIEWS',
      });
    });
  });
});
