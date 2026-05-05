import fetchMock from 'fetch-mock';
import { fetchGoalDashboardData } from '../goals';

describe('fetchGoalDashboardData', () => {
  afterEach(() => fetchMock.restore());

  it('fetches from /api/widgets/goalDashboard with no query', async () => {
    const innerData = { total: 5, sankey: { nodes: [], links: [] } };
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: innerData });
    const result = await fetchGoalDashboardData();
    expect(result).toEqual(innerData);
    expect(fetchMock.called('/api/widgets/goalDashboard')).toBe(true);
  });

  it('appends query string when a query is provided', async () => {
    const innerData = { total: 2, sankey: { nodes: [], links: [] } };
    fetchMock.get('/api/widgets/goalDashboard?region.in[]=1', { goalStatusWithReasons: innerData });
    const result = await fetchGoalDashboardData('region.in[]=1');
    expect(result).toEqual(innerData);
    expect(fetchMock.called('/api/widgets/goalDashboard?region.in[]=1')).toBe(true);
  });
});
