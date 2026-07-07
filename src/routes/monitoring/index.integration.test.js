import express from 'express';
import request from 'supertest';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import compliantFollowUpReviewsDetails from '../../services/compliantFollowUpReviewsDetails';
import { currentUserId } from '../../services/currentUser';
import { onlyAllowedKeys } from '../widgets/utils';
import router from './index';

jest.mock('../transactionWrapper', () => jest.fn((fn) => fn));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../services/accessValidation', () => ({
  setReadRegions: jest.fn(),
}));

jest.mock('../../scopes', () => jest.fn());

jest.mock('../widgets/utils', () => ({
  onlyAllowedKeys: jest.fn(),
}));

jest.mock('../../services/compliantFollowUpReviewsDetails', () => jest.fn());

describe('monitoring route integration', () => {
  const app = express();
  app.use('/monitoring', router);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves compliant follow-up review details through the monitoring route', async () => {
    const details = [
      {
        id: 777,
        recipientName: 'Integration Recipient',
        grantsOnReview: ['99CH12345'],
        citationNumbers: ['1302.12(d)(1)'],
        hasTta: true,
        lastTtaDate: '2025-03-10',
        associatedActivityReports: [1001, 1002],
        compliantFollowUpReviewReceivedDate: '2025-02-20',
        initialReviewReceivedDate: '2024-10-12',
        initialReviewId: 555,
      },
    ];

    currentUserId.mockResolvedValue(314);
    setReadRegions.mockResolvedValue({ 'region.in': ['2'] });
    onlyAllowedKeys.mockReturnValue({ 'region.in': ['2'] });
    filtersToScopes.mockResolvedValue({ deliveredReview: [], grantCitation: [] });
    compliantFollowUpReviewsDetails.mockResolvedValue(details);

    const response = await request(app).get('/monitoring/compliant-follow-up-reviews/details');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(details);
    expect(currentUserId).toHaveBeenCalled();
    expect(setReadRegions).toHaveBeenCalledWith(expect.anything(), 314);
    expect(onlyAllowedKeys).toHaveBeenCalledWith({ 'region.in': ['2'] });
    expect(filtersToScopes).toHaveBeenCalledWith(
      { 'region.in': ['2'] },
      {
        grant: { subset: true },
        userId: 314,
      }
    );
    expect(compliantFollowUpReviewsDetails).toHaveBeenCalledWith({
      deliveredReview: [],
      grantCitation: [],
    });
  });
});
