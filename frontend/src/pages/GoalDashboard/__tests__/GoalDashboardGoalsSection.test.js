import { buildGoalDashboardGoalsQuery } from '../GoalDashboardGoalsSection';

describe('buildGoalDashboardGoalsQuery', () => {
  it('includes active filters in the dashboard table query', () => {
    const query = buildGoalDashboardGoalsQuery({
      sortBy: 'goalStatus',
      direction: 'asc',
      offset: 10,
      perPage: 20,
      filters: [
        { topic: 'region', condition: 'is', query: ['1', '2'] },
        { topic: 'goalStatus', condition: 'contains', query: 'Needs support' },
      ],
    });

    expect(query).toBe(
      'sortBy=goalStatus&direction=asc&skipCache=true&offset=10&perPage=20&region.in[]=1&region.in[]=2&goalStatus.ctn[]=Needs%20support'
    );
  });

  it('includes active filters in the csv export query without pagination params', () => {
    const query = buildGoalDashboardGoalsQuery({
      sortBy: 'goalCategory',
      direction: 'desc',
      format: 'csv',
      filters: [{ topic: 'goalStatus', condition: 'is', query: ['Suspended'] }],
    });

    expect(query).toBe(
      'sortBy=goalCategory&direction=desc&skipCache=true&format=csv&goalStatus.in[]=Suspended'
    );
  });
});
