import fetchMock from 'fetch-mock';
import join from 'url-join';
import { getMonitoringRelatedTtaCsv, getTtaByCitation, getTtaByReview } from '../monitoring';

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
    const query = 'sortBy=recipient_finding&direction=asc';
    fetchMock.get(`${monitoringUrl}/related-tta?${query}`, {
      body: 'col1,col2\nval1,val2',
      headers: { 'Content-Type': 'text/csv' },
    });

    const result = await getMonitoringRelatedTtaCsv(query);

    expect(fetchMock.called(`${monitoringUrl}/related-tta?${query}`)).toBe(true);
    expect(result.constructor.name).toBe('Blob');
  });
});
