import fetchMock from 'fetch-mock';
import {
  updateGoalStatus,
  missingDataForActivityReport,
  createGoalsFromTemplate,
} from '../goals';

describe('goals fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('createGoalsFromTemplate', async () => {
    fetchMock.post('/api/goals/template/1', { res: 'ok' });

    const res = await createGoalsFromTemplate(1, { data: 'data' });

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

  it('gets missing data', async () => {
    const url = '/api/goals/region/123/incomplete?goalIds=1&goalIds=2';
    fetchMock.get(
      url,
      { res: 'ok' },
    );

    await missingDataForActivityReport(123, [1, 2]);
    expect(fetchMock.called(url)).toBeTruthy();
  });
});
