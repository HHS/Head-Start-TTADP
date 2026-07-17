import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  getCompliantFollowUpReviewsDetails,
  getCompliantFollowUpReviewsDetailsCsv,
  getMonitoringRelatedTtaCsv,
  getTtaByCitation,
  getTtaByReview,
} from '../monitoring';

const monitoringUrl = join('/', 'api', 'monitoring');

describe('monitoring fetchers', () => {
  it('getTtaByCitation', async () => {
    fetchMock.get(`${monitoringUrl}/${1}/region/${1}/tta/citation`, [
      {
        id: 1,
      },
    ]);

    const data = await getTtaByCitation(1, 1);

    expect(data).toEqual([
      {
        id: 1,
      },
    ]);
  });
  it('getTtaByReview', async () => {
    fetchMock.get(`${monitoringUrl}/${1}/region/${1}/tta/review`, [
      {
        id: 1,
      },
    ]);

    const data = await getTtaByReview(1, 1);

    expect(data).toEqual([
      {
        id: 1,
      },
    ]);
  });
  it('getMonitoringRelatedTtaCsv', async () => {
    const query = 'sortBy=citation&direction=asc';
    fetchMock.get(`${monitoringUrl}/related-tta?${query}`, {
      body: 'col1,col2\nval1,val2',
      headers: { 'Content-Type': 'text/csv' },
    });

    const result = await getMonitoringRelatedTtaCsv(query);

    expect(fetchMock.called(`${monitoringUrl}/related-tta?${query}`)).toBe(true);
    expect(result.constructor.name).toBe('Blob');
  });

  it('getCompliantFollowUpReviewsDetails', async () => {
    const query = 'startDate.win=2025/01/01-2025/12/31';
    const encodedQuery = 'startDate.win=2025%2F01%2F01-2025%2F12%2F31';
    fetchMock.get(`${monitoringUrl}/compliant-follow-up-reviews/details?${encodedQuery}`, [
      {
        reviewId: 1,
        recipientName: 'Recipient A',
      },
    ]);

    const data = await getCompliantFollowUpReviewsDetails(query);

    expect(
      fetchMock.called(`${monitoringUrl}/compliant-follow-up-reviews/details?${encodedQuery}`)
    ).toBe(true);
    expect(data).toEqual([
      {
        reviewId: 1,
        recipientName: 'Recipient A',
      },
    ]);
  });

  it('getCompliantFollowUpReviewsDetailsCsv', async () => {
    const query = 'startDate.win=2025/01/01-2025/12/31';
    const encodedQuery = 'startDate.win=2025%2F01%2F01-2025%2F12%2F31&format=csv';
    fetchMock.get(`${monitoringUrl}/compliant-follow-up-reviews/details?${encodedQuery}`, {
      body: 'recipient,had_tta\nRecipient A,Yes',
      headers: { 'Content-Type': 'text/csv' },
    });

    const result = await getCompliantFollowUpReviewsDetailsCsv(query);

    expect(
      fetchMock.called(`${monitoringUrl}/compliant-follow-up-reviews/details?${encodedQuery}`)
    ).toBe(true);
    expect(result.constructor.name).toBe('Blob');
  });
});
