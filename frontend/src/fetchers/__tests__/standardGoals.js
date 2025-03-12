import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  getStandardGoal,
  addStandardGoal,
  updateStandardGoal,
} from '../standardGoals';

const standardGoalUrl = join('/', 'api', 'goal-templates', 'standard');

describe('StandardGoals fetcher', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('getStandardGoal', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(standardGoalUrl,
      '1',
      'grant',
      '1');
    fetchMock.getOnce(url, mockData);
    const res = await getStandardGoal(1, 1);
    expect(res).toEqual(mockData);
    expect(fetchMock.called(url)).toBeTruthy();
  });
  it('getStandardGoal w/status', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(standardGoalUrl,
      '1',
      'grant',
      '1',
      '?status=Closed');
    fetchMock.getOnce(url, mockData);
    const res = await getStandardGoal(1, 1, 'Closed');
    expect(res).toEqual(mockData);
    expect(fetchMock.called(url)).toBeTruthy();
  });
  it('addStandardGoal', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(standardGoalUrl,
      '1',
      'grant',
      '1');
    fetchMock.postOnce(url, mockData);
    const res = await addStandardGoal({
      grantId: 1,
      goalTemplateId: 1,
      data: 'Expected',
    });
    expect(res).toEqual(mockData);
    expect(fetchMock.called(url)).toBeTruthy();
  });
  it('updateStandardGoal', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(standardGoalUrl,
      '1',
      'grant',
      '1');
    fetchMock.putOnce(url, mockData);
    const res = await updateStandardGoal({
      grantId: 1,
      goalTemplateId: 1,
      data: 'Expected',
    });
    expect(res).toEqual(mockData);
    expect(fetchMock.called(url)).toBeTruthy();
  });
});
