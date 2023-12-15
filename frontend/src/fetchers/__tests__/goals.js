import fetchMock from 'fetch-mock';
import { updateGoalStatus, mergeGoals, similarity } from '../goals';

describe('goals fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('merges goals', async () => {
    fetchMock.post('/api/goals/recipient/1/region/2/merge', { res: 'ok' });

    const res = await mergeGoals([1, 2, 3], 4, 1, 2);

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
    fetchMock.get('/api/goals/similar/123?cluster=true', { res: 'ok' });
    await similarity(123);
    expect(fetchMock.called()).toBeTruthy();
  });
});
