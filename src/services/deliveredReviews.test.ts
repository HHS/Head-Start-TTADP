import db from '../models';
import { getCitationReviewTypes } from './deliveredReviews';

jest.mock('../models', () => ({
  DeliveredReview: {
    findAll: jest.fn(),
  },
  DeliveredReviewCitation: {},
}));

const mockFindAll = db.DeliveredReview.findAll as jest.Mock;

describe('deliveredReviews service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCitationReviewTypes', () => {
    it('returns an array of review_type strings', async () => {
      mockFindAll.mockResolvedValue([
        { review_type: 'Annual' },
        { review_type: 'Follow-up' },
        { review_type: 'Special' },
      ]);

      const result = await getCitationReviewTypes();

      expect(result).toEqual(['Annual', 'Follow-up', 'Special']);
    });

    it('calls findAll with correct parameters', async () => {
      mockFindAll.mockResolvedValue([]);

      await getCitationReviewTypes();

      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          raw: true,
          order: [['review_type', 'ASC']],
          attributes: ['review_type'],
          group: ['review_type'],
        })
      );
    });

    it('includes deliveredReviewCitations with required: true', async () => {
      mockFindAll.mockResolvedValue([]);

      await getCitationReviewTypes();

      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              as: 'deliveredReviewCitations',
              required: true,
            }),
          ]),
        })
      );
    });

    it('returns empty array when no records found', async () => {
      mockFindAll.mockResolvedValue([]);

      const result = await getCitationReviewTypes();

      expect(result).toEqual([]);
    });
  });
});
