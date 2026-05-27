import fetchMock from 'fetch-mock';
import {
  fetchGoalDashboardData,
  fetchGoalDashboardGoals,
  fetchGoalDashboardGoalsByIds,
  fetchGoalDashboardGoalsCsv,
  fetchGoalDashboardGoalsCsvByIds,
} from '../goals';

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

describe('fetchGoalDashboardGoals', () => {
  afterEach(() => fetchMock.restore());

  it('fetches from /api/widgets/goalDashboardGoals with no query', async () => {
    const innerData = { count: 5, goalRows: [], allGoalIds: [] };
    fetchMock.get('/api/widgets/goalDashboardGoals', { goalDashboardGoals: innerData });
    const result = await fetchGoalDashboardGoals();
    expect(result).toEqual(innerData);
    expect(fetchMock.called('/api/widgets/goalDashboardGoals')).toBe(true);
  });

  it('appends query string when a query is provided', async () => {
    const innerData = { count: 2, goalRows: [], allGoalIds: [] };
    fetchMock.get('/api/widgets/goalDashboardGoals?sortBy=goalStatus', {
      goalDashboardGoals: innerData,
    });
    const result = await fetchGoalDashboardGoals('sortBy=goalStatus');
    expect(result).toEqual(innerData);
    expect(fetchMock.called('/api/widgets/goalDashboardGoals?sortBy=goalStatus')).toBe(true);
  });
});

describe('fetchGoalDashboardGoalsByIds', () => {
  afterEach(() => fetchMock.restore());

  it('posts goal ids to /api/widgets/goalDashboardGoals', async () => {
    const innerData = { count: 2, goalRows: [{ id: 3 }], allGoalIds: [] };
    fetchMock.post('/api/widgets/goalDashboardGoals?sortBy=goalStatus', {
      goalDashboardGoals: innerData,
    });

    const result = await fetchGoalDashboardGoalsByIds('sortBy=goalStatus', [3, 7]);

    expect(result).toEqual(innerData);
    expect(fetchMock.called('/api/widgets/goalDashboardGoals?sortBy=goalStatus')).toBe(true);
    expect(fetchMock.lastOptions().body).toBe(JSON.stringify({ goalIds: [3, 7] }));
  });
});

describe('fetchGoalDashboardGoalsCsv', () => {
  afterEach(() => fetchMock.restore());

  it('fetches a csv blob from the goal dashboard widget', async () => {
    const blob = new Blob(['Recipient name,Grant Number'], { type: 'text/csv' });
    fetchMock.get('/api/widgets/goalDashboardGoals?format=csv', {
      body: blob,
      headers: { 'Content-Type': 'text/csv' },
    });

    const result = await fetchGoalDashboardGoalsCsv('format=csv');

    expect(result.type).toBe('text/csv');
    expect(fetchMock.called('/api/widgets/goalDashboardGoals?format=csv')).toBe(true);
  });
});

describe('fetchGoalDashboardGoalsCsvByIds', () => {
  afterEach(() => fetchMock.restore());

  it('posts goal ids and returns a csv blob from the goal dashboard widget', async () => {
    const blob = new Blob(['Recipient name,Grant Number'], { type: 'text/csv' });
    fetchMock.post('/api/widgets/goalDashboardGoals?format=csv', {
      body: blob,
      headers: { 'Content-Type': 'text/csv' },
    });

    const result = await fetchGoalDashboardGoalsCsvByIds('format=csv', [1, 2]);

    expect(result.type).toBe('text/csv');
    expect(fetchMock.called('/api/widgets/goalDashboardGoals?format=csv')).toBe(true);
    expect(fetchMock.lastOptions().body).toBe(JSON.stringify({ goalIds: [1, 2] }));
  });
});
