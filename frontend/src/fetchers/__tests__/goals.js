import fetchMock from 'fetch-mock';
import { updateGoalStatus } from '../goals';

describe('goals fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('test updates goals status', async () => {
    fetchMock.put('/api/goals/4598/changeStatus', {
      id: 4598,
      status: 'Completed',
      createdOn: '06/15/2021',
      goalText: 'This is goal text 1.',
      goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
      objectiveCount: 5,
      goalNumber: 'R14-G-4598',
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    });
    await updateGoalStatus('4598', 'In Progress');
    expect(fetchMock.called()).toBeTruthy();
  });
});
