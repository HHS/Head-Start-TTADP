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
        reviewId: 9777,
        reviewName: 'Compliant Follow-Up Review',
        recipientName: 'Integration Recipient',
        grantsOnReview: ['99CH12345'],
        citationNumbers: ['1302.12(d)(1)'],
        hasTta: true,
        lastTtaDate: '2025-03-10',
        associatedActivityReports: [1001, 1002],
        compliantFollowUpReviewReceivedDate: '2025-02-20',
        initialReviews: [
          {
            reviewId: 555,
            reviewName: 'Initial Review',
            reviewReceivedDate: '2024-10-12',
          },
        ],
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

  it('serves compliant follow-up review details as CSV when format=csv', async () => {
    const details = [
      {
        reviewId: 9777,
        reviewName: 'Compliant Follow-Up Review',
        recipientName: 'Integration Recipient',
        regionId: 2,
        grantsOnReview: ['99CH12345'],
        citationNumbers: ['1302.12(d)(1)'],
        hasTta: true,
        lastTtaDate: '2025-03-10',
        associatedActivityReports: [1001, 1002],
        compliantFollowUpReviewReceivedDate: '2025-02-20',
        initialReviews: [
          {
            reviewId: 555,
            reviewName: 'Initial Review',
            reviewReceivedDate: '2024-10-12',
          },
        ],
      },
    ];

    currentUserId.mockResolvedValue(314);
    setReadRegions.mockResolvedValue({ 'region.in': ['2'], format: 'csv' });
    onlyAllowedKeys.mockReturnValue({ 'region.in': ['2'] });
    filtersToScopes.mockResolvedValue({ deliveredReview: [], grantCitation: [] });
    compliantFollowUpReviewsDetails.mockResolvedValue(details);

    const response = await request(app)
      .get('/monitoring/compliant-follow-up-reviews/details')
      .query({ format: 'csv' });

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('compliant-follow-up-reviews.csv');
    expect(response.text).toContain('Compliant follow-up review');
    expect(response.text).toContain('Compliant Follow-Up Review');
    expect(response.text).toContain('Initial Review');
    expect(response.text).toContain('Integration Recipient');
    expect(response.text).toContain('R02-AR-1001');
    expect(response.text).toContain('R02-AR-1002');
    expect(response.text).toContain('03/10/2025');
  });
});
