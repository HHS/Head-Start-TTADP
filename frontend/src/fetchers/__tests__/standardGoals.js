import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  get, post, put,
} from '../index';
import {
  getStandardGoal,
  addStandardGoal,
  updateStandardGoal,
} from '../standardGoals';

jest.mock('../index', () => {
  const originalModule = jest.requireActual('../index');
  return {
    ...originalModule,
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };
});

const standardGoalUrl = join('/', 'api', 'goal-templates', 'standard');

describe('StandardGoals fetcher', () => {
  beforeEach(() => {
    fetchMock.restore();
    post.mockClear();
    get.mockClear();
    put.mockClear();
  });

  it('getStandardGoal', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(standardGoalUrl,
      '1',
      'grant',
      '1');
    get.mockResolvedValue({ json: async () => mockData });
    const res = await getStandardGoal(1, 1);
    expect(res).toEqual(mockData);
    expect(get).toHaveBeenCalledWith(url);
  });
  it('getStandardGoal w/status', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(standardGoalUrl,
      '1',
      'grant',
      '1?status=Closed');
    get.mockResolvedValue({ json: async () => mockData });
    const res = await getStandardGoal(1, 1, 'Closed');
    expect(res).toEqual(mockData);
    expect(get).toHaveBeenCalledWith(url);
  });
  it('addStandardGoal', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(standardGoalUrl,
      '1',
      'grant',
      '1');
    const mockGoodResponse = { ok: true, json: async () => mockData };
    post.mockResolvedValue(mockGoodResponse);
    const goalData = {
      grantId: 1,
      goalTemplateId: 1,
      data: 'Expected',
    };
    const res = await addStandardGoal(goalData);
    expect(res).toEqual(mockData);
    expect(post).toHaveBeenCalledWith(url, { data: 'Expected' });
  });

  it('addStandardGoal throws HTTPError on non-ok response', async () => {
    const mockBadResponse = {
      ok: false,
      status: 500,
      statusText: 'Server Error',
    };
    post.mockResolvedValue(mockBadResponse);

    const goalData = {
      grantId: 1,
      goalTemplateId: 1,
      data: 'Expected',
    };
    const expectedUrl = join(standardGoalUrl, '1', 'grant', '1');
    await expect(addStandardGoal(goalData)).rejects.toThrow();
    expect(post).toHaveBeenCalledWith(expectedUrl, { data: 'Expected' });
  });

  it('updateStandardGoal', async () => {
    const mockData = { updated: true };
    const mockGoodResponse = {
      ok: true,
      json: async () => mockData,
    };
    put.mockResolvedValue(mockGoodResponse);

    const goalData = {
      grantId: 1,
      goalTemplateId: 1,
      data: 'Expected Update',
    };

    const res = await updateStandardGoal(goalData);
    expect(res).toEqual(mockData);

    const expectedUrl = join(standardGoalUrl, '1', 'grant', '1');
    expect(put).toHaveBeenCalledWith(expectedUrl, { data: 'Expected Update' });
  });
});
