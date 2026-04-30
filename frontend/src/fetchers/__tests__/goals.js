import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { missingDataForActivityReport, updateGoalStatus } from '../goals';

describe('goals fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('test updates goals status', async () => {
    fetchMock.put('/api/goals/changeStatus', [
      {
        id: 4598,
        status: 'Completed',
        createdOn: '06/15/2021',
        goalText: 'This is goal text 1.',
        goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
        objectiveCount: 5,
        goalNumber: 'G-4598',
        reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      },
    ]);
    await updateGoalStatus([4598], GOAL_STATUS.IN_PROGRESS);
    expect(fetchMock.called()).toBeTruthy();
  });

  it('gets missing data', async () => {
    const url = '/api/goals/region/123/incomplete?goalIds=1&goalIds=2';
    fetchMock.get(url, { res: 'ok' });

    await missingDataForActivityReport(123, [1, 2]);
    expect(fetchMock.called(url)).toBeTruthy();
  });
});
