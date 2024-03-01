import fetchMock from 'fetch-mock';
import {
  updateGoalStatus,
  mergeGoals,
  similarity,
  similiarGoalsByText,
} from '../goals';

describe('goals fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('merges goals', async () => {
    fetchMock.post('/api/goals/recipient/1/region/2/merge', { res: 'ok' });

    const res = await mergeGoals([1, 2, 3], 4, 1, 2, 1);

    expect(res).toEqual({ res: 'ok' });
  });

  it('test updates goals status', async () => {
    fetchMock.put('/api/goals/changeStatus', [{
      id: 4598,
      status: 'Completed',
      createdOn: '06/15/2021',
      goalText: 'This is goal text 1.',
      goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
      objectiveCount: 5,
      goalNumber: 'G-4598',
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    }]);
    await updateGoalStatus([4598], 'In Progress');
    expect(fetchMock.called()).toBeTruthy();
  });

  it('retrieves similarity', async () => {
    fetchMock.get('/api/goals/similar/region/123/recipient/123?cluster=true', { res: 'ok' });
    await similarity(123, 123);
    expect(fetchMock.called()).toBeTruthy();
  });

  it('fetches similar goals by text', async () => {
    const url = '/api/goals/recipient/123/region/123/nudge?name=goal&grantNumbers=123&grantNumbers=456';
    fetchMock.get(
      url,
      { res: 'ok' },
    );
    await similiarGoalsByText(
      123,
      123,
      'goal',
      ['123', '456'],
    );

    expect(fetchMock.called(url)).toBeTruthy();
  });
});
