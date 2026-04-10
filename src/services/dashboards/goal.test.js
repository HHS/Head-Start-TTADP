import { Op } from 'sequelize';
import { Goal, GoalStatusChange } from '../../models';
import { goalDashboard } from './goal';

jest.mock('../../models', () => ({
  Goal: {
    findAll: jest.fn(),
  },
  GoalStatusChange: {
    findAll: jest.fn(),
  },
  ActivityReport: {},
  Grant: {},
  Recipient: {},
}));

describe('goalDashboard service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns status and reason rows with sankey data', async () => {
    Goal.findAll.mockResolvedValueOnce([
      { id: 1, status: 'Not Started' },
      { id: 2, status: 'Not Started' },
      { id: 3, status: 'In Progress' },
      { id: 4, status: 'Closed' },
      { id: 5, status: 'Suspended' },
    ]);

    GoalStatusChange.findAll.mockResolvedValueOnce([
      {
        goalId: 4,
        newStatus: 'Closed',
        reason: 'TTA complete',
        performedAt: '2026-01-01T00:00:00Z',
        id: 11,
      },
      {
        goalId: 5,
        newStatus: 'Suspended',
        reason: 'Recipient request',
        performedAt: '2026-01-02T00:00:00Z',
        id: 12,
      },
    ]);

    const result = await goalDashboard({ goal: [] });

    const findAllArgs = Goal.findAll.mock.calls[0][0];
    expect(findAllArgs.where[Op.and]).toEqual(expect.arrayContaining([
      { onApprovedAR: true },
    ]));
    expect(findAllArgs.include).toEqual(expect.arrayContaining([
      expect.objectContaining({
        as: 'activityReports',
        required: true,
        where: expect.objectContaining({
          calculatedStatus: 'approved',
          startDate: {
            [Op.gte]: '2025-09-09',
          },
        }),
      }),
    ]));

    expect(result.goalStatusWithReasons.total).toBe(5);
    expect(result.goalStatusWithReasons.statusRows).toEqual([
      {
        status: 'Not Started',
        label: 'Not started',
        count: 2,
        percentage: 40,
      },
      {
        status: 'In Progress',
        label: 'In progress',
        count: 1,
        percentage: 20,
      },
      {
        status: 'Closed',
        label: 'Closed',
        count: 1,
        percentage: 20,
      },
      {
        status: 'Suspended',
        label: 'Suspended',
        count: 1,
        percentage: 20,
      },
    ]);

    expect(result.goalStatusWithReasons.reasonRows).toEqual([
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
    ]);

    expect(result.goalStatusWithReasons.sankey.links).toEqual(expect.arrayContaining([
      {
        source: 'goals',
        target: 'status:Not Started',
        value: 2,
      },
      {
        source: 'status:Closed',
        target: 'reason:Closed:TTA complete',
        value: 1,
      },
    ]));
  });

  it('uses Unknown when a closed/suspended goal has no matching status change reason', async () => {
    Goal.findAll.mockResolvedValueOnce([
      { id: 21, status: 'Closed' },
      { id: 22, status: 'Suspended' },
    ]);
    GoalStatusChange.findAll.mockResolvedValueOnce([]);

    const result = await goalDashboard({ goal: [] });

    expect(result.goalStatusWithReasons.reasonRows).toEqual([
      {
        status: 'Closed',
        statusLabel: 'Closed',
        reason: 'Unknown',
        count: 1,
        percentage: 100,
      },
      {
        status: 'Suspended',
        statusLabel: 'Suspended',
        reason: 'Unknown',
        count: 1,
        percentage: 100,
      },
    ]);
  });

  it('uses the latest matching closed/suspended reason for each goal status', async () => {
    Goal.findAll.mockResolvedValueOnce([
      { id: 31, status: 'Closed' },
      { id: 32, status: 'Suspended' },
      { id: 33, status: 'In Progress' },
    ]);

    GoalStatusChange.findAll.mockResolvedValueOnce([
      {
        goalId: 31,
        newStatus: 'Suspended',
        reason: 'stale suspended reason',
        performedAt: '2026-01-04T00:00:00Z',
        id: 104,
      },
      {
        goalId: 31,
        newStatus: 'Closed',
        reason: 'Final closure reason',
        performedAt: '2026-01-03T00:00:00Z',
        id: 103,
      },
      {
        goalId: 31,
        newStatus: 'Closed',
        reason: 'Older closure reason',
        performedAt: '2026-01-01T00:00:00Z',
        id: 101,
      },
      {
        goalId: 32,
        newStatus: 'Suspended',
        reason: '  Temporary pause  ',
        performedAt: '2026-01-05T00:00:00Z',
        id: 105,
      },
    ]);

    const result = await goalDashboard({ goal: [] });

    expect(GoalStatusChange.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        goalId: { [Op.in]: [31, 32] },
        newStatus: { [Op.in]: ['Closed', 'Suspended'] },
      },
    }));

    expect(result.goalStatusWithReasons.reasonRows).toEqual([
      {
        status: 'Closed',
        statusLabel: 'Closed',
        reason: 'Final closure reason',
        count: 1,
        percentage: 100,
      },
      {
        status: 'Suspended',
        statusLabel: 'Suspended',
        reason: 'Temporary pause',
        count: 1,
        percentage: 100,
      },
    ]);
  });

  it('uses Unknown when a matching status change reason is blank', async () => {
    Goal.findAll.mockResolvedValueOnce([
      { id: 41, status: 'Closed' },
    ]);

    GoalStatusChange.findAll.mockResolvedValueOnce([
      {
        goalId: 41,
        newStatus: 'Closed',
        reason: '   ',
        performedAt: '2026-01-01T00:00:00Z',
        id: 201,
      },
    ]);

    const result = await goalDashboard({ goal: [] });

    expect(result.goalStatusWithReasons.reasonRows).toEqual([
      {
        status: 'Closed',
        statusLabel: 'Closed',
        reason: 'Unknown',
        count: 1,
        percentage: 100,
      },
    ]);
  });
});
