import { getGoalDashboardData } from './dashboardHandlers';
import { currentUserId } from '../../services/currentUser';
import { setReadRegions } from '../../services/accessValidation';
import filtersToScopes from '../../scopes';
import getCachedResponse from '../../lib/cache';
import { goalDashboard } from '../../services/dashboards/goal';

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../services/accessValidation', () => ({
  setReadRegions: jest.fn(),
}));

jest.mock('../../scopes', () => jest.fn());

jest.mock('../../lib/cache', () => jest.fn());

jest.mock('../../services/dashboards/goal', () => ({
  goalDashboard: jest.fn(),
}));

describe('goal dashboard handler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached goal dashboard data', async () => {
    const req = {
      query: {
        'region.in': ['1', '2'],
      },
    };

    const res = {
      json: jest.fn(),
    };

    const readScopedQuery = {
      'region.in': ['1'],
    };

    const scopes = { goal: [] };
    const payload = {
      goalStatusWithReasons: {
        total: 3,
        statusRows: [],
        reasonRows: [],
        sankey: { nodes: [], links: [] },
      },
    };

    currentUserId.mockResolvedValueOnce(77);
    setReadRegions.mockResolvedValueOnce(readScopedQuery);
    filtersToScopes.mockResolvedValueOnce(scopes);
    goalDashboard.mockResolvedValueOnce(payload);

    getCachedResponse.mockImplementationOnce(async (_key, fn, parser) => parser(await fn()));

    await getGoalDashboardData(req, res);

    expect(setReadRegions).toHaveBeenCalledWith(req.query, 77);
    expect(filtersToScopes).toHaveBeenCalledWith(readScopedQuery, { userId: 77 });
    expect(goalDashboard).toHaveBeenCalledWith(scopes);
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it('returns closed and suspended goal reasons in the payload', async () => {
    const req = {
      query: {
        'region.in': ['1'],
      },
    };

    const res = {
      json: jest.fn(),
    };

    const readScopedQuery = {
      'region.in': ['1'],
    };

    const scopes = { goal: [] };
    const payload = {
      goalStatusWithReasons: {
        total: 2,
        statusRows: [
          {
            status: 'Closed',
            label: 'Closed',
            count: 1,
            percentage: 50,
          },
          {
            status: 'Suspended',
            label: 'Suspended',
            count: 1,
            percentage: 50,
          },
        ],
        reasonRows: [
          {
            status: 'Closed',
            statusLabel: 'Closed',
            reason: 'TTA complete',
            count: 1,
            percentage: 100,
          },
          {
            status: 'Suspended',
            statusLabel: 'Suspended',
            reason: 'Recipient request',
            count: 1,
            percentage: 100,
          },
        ],
        sankey: {
          nodes: [],
          links: [],
        },
      },
    };

    currentUserId.mockResolvedValueOnce(77);
    setReadRegions.mockResolvedValueOnce(readScopedQuery);
    filtersToScopes.mockResolvedValueOnce(scopes);
    goalDashboard.mockResolvedValueOnce(payload);

    getCachedResponse.mockImplementationOnce(async (_key, fn, parser) => parser(await fn()));

    await getGoalDashboardData(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      goalStatusWithReasons: expect.objectContaining({
        reasonRows: [
          expect.objectContaining({
            status: 'Closed',
            reason: 'TTA complete',
          }),
          expect.objectContaining({
            status: 'Suspended',
            reason: 'Recipient request',
          }),
        ],
      }),
    }));
  });
});
