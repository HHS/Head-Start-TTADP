import fetchMock from 'fetch-mock';
import { getCitationReviewTypes } from '../deliveredReviews';

describe('deliveredReviews fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('calls the correct endpoint', async () => {
    fetchMock.get('/api/delivered-reviews/citation-review-types', []);
    await getCitationReviewTypes();
    expect(fetchMock.called('/api/delivered-reviews/citation-review-types')).toBeTruthy();
  });

  it('returns parsed JSON data', async () => {
    const reviewTypes = ['Standard Review', 'Focused Review'];
    fetchMock.get('/api/delivered-reviews/citation-review-types', reviewTypes);
    const result = await getCitationReviewTypes();
    expect(result).toEqual(reviewTypes);
  });
});
