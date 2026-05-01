import { Op } from 'sequelize';
import { Goal, GoalStatusChange, ActivityReportObjective } from '../../models';
import { goalDashboard, goalDashboardGoals } from './goal';

jest.mock('../../models', () => ({
  sequelize: {
    col: jest.fn((column) => column),
    literal: jest.fn((literal) => literal),
  },
  Goal: {
    findAll: jest.fn(),
    count: jest.fn(),
  },
  GoalStatusChange: {
    findAll: jest.fn(),
  },
  ActivityReportObjective: {
    findAll: jest.fn(),
  },
  ActivityReport: {},
  Grant: {},
  Recipient: {},
  GoalTemplate: {},
  GoalFieldResponse: {},
  User: {},
  Role: {},
  Objective: {},
  Topic: {},
  ActivityReportObjectiveCitation: {},
}));

describe('goalDashboard service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('queries standard goals created on or after cutoff and linked to approved ARs', async () => {
    Goal.findAll.mockResolvedValueOnce([]);

    await goalDashboard({ goal: [] });

    expect(Goal.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        [Op.and]: expect.arrayContaining([
          { prestandard: false },
          { createdAt: { [Op.gte]: '2025-09-09' } },
          {
            status: {
              [Op.in]: ['Not Started', 'In Progress', 'Closed', 'Suspended'],
            },
          },
        ]),
      },
      include: expect.arrayContaining([
        expect.objectContaining({
          as: 'activityReports',
          required: true,
          where: expect.objectContaining({
            calculatedStatus: 'approved',
          }),
        }),
      ]),
    }));

    const findAllArgs = Goal.findAll.mock.calls[0][0];
    expect(findAllArgs.where[Op.and]).not.toEqual(expect.arrayContaining([
      { onApprovedAR: true },
    ]));

    const activityReportInclude = findAllArgs.include.find((include) => include.as === 'activityReports');
    expect(activityReportInclude.where.startDate).toBeUndefined();
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

    expect(result.goalStatusWithReasons.dataStartDate).toBe('2025-09-09');
    expect(result.goalStatusWithReasons.dataStartDateDisplay).toBe('09/09/2025');
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

  it('excludes zero-count statuses from sankey nodes and links', async () => {
    Goal.findAll.mockResolvedValueOnce([
      { id: 51, status: 'In Progress' },
      { id: 52, status: 'Closed' },
      { id: 53, status: 'Closed' },
    ]);

    GoalStatusChange.findAll.mockResolvedValueOnce([
      {
        goalId: 52,
        newStatus: 'Closed',
        reason: 'TTA complete',
        performedAt: '2026-01-01T00:00:00Z',
        id: 301,
      },
      {
        goalId: 53,
        newStatus: 'Closed',
        reason: 'Recipient request',
        performedAt: '2026-01-02T00:00:00Z',
        id: 302,
      },
    ]);

    const result = await goalDashboard({ goal: [] });

    expect(result.goalStatusWithReasons.statusRows).toEqual([
      {
        status: 'Not Started',
        label: 'Not started',
        count: 0,
        percentage: 0,
      },
      {
        status: 'In Progress',
        label: 'In progress',
        count: 1,
        percentage: 33.33,
      },
      {
        status: 'Closed',
        label: 'Closed',
        count: 2,
        percentage: 66.67,
      },
      {
        status: 'Suspended',
        label: 'Suspended',
        count: 0,
        percentage: 0,
      },
    ]);

    expect(result.goalStatusWithReasons.sankey.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'goals', count: 3 }),
      expect.objectContaining({ id: 'status:In Progress', count: 1 }),
      expect.objectContaining({ id: 'status:Closed', count: 2 }),
      expect.objectContaining({ id: 'reason:Closed:TTA complete', count: 1 }),
      expect.objectContaining({ id: 'reason:Closed:Recipient request', count: 1 }),
    ]));
    expect(result.goalStatusWithReasons.sankey.nodes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'status:Not Started' }),
      expect.objectContaining({ id: 'status:Suspended' }),
    ]));

    expect(result.goalStatusWithReasons.sankey.links).toEqual(expect.arrayContaining([
      { source: 'goals', target: 'status:In Progress', value: 1 },
      { source: 'goals', target: 'status:Closed', value: 2 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 1 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient request', value: 1 },
    ]));
    expect(result.goalStatusWithReasons.sankey.links).not.toEqual(expect.arrayContaining([
      { source: 'goals', target: 'status:Not Started', value: 0 },
      { source: 'goals', target: 'status:Suspended', value: 0 },
    ]));
  });

  it('returns an empty sankey payload when there are no goals', async () => {
    Goal.findAll.mockResolvedValueOnce([]);

    const result = await goalDashboard({ goal: [] });

    expect(GoalStatusChange.findAll).not.toHaveBeenCalled();
    expect(result.goalStatusWithReasons.total).toBe(0);
    expect(result.goalStatusWithReasons.sankey).toEqual({
      nodes: [],
      links: [],
    });
  });
});

describe('goalDashboardGoals service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns dashboard goal cards with recipient details and pagination metadata', async () => {
    const hydratedGoal = {
      id: 1,
      name: '(Family Engagement) The recipient will implement family engagement strategies.',
      status: 'Not Started',
      createdAt: '2026-02-01',
      goalTemplateId: 10,
      prestandard: false,
      onAR: false,
      onApprovedAR: true,
      standard: 'Family Engagement',
      statusChanges: [],
      responses: [],
      objectives: [],
      grant: {
        id: 20,
        number: '22RE220001 - HS',
        recipientId: 30,
        regionId: 1,
        recipient: {
          id: 30,
          name: 'Children and Families First',
        },
      },
      toJSON() {
        return {
          id: this.id,
          name: this.name,
          status: this.status,
          createdAt: this.createdAt,
          goalTemplateId: this.goalTemplateId,
          prestandard: this.prestandard,
          onAR: this.onAR,
          onApprovedAR: this.onApprovedAR,
          standard: this.standard,
          statusChanges: this.statusChanges,
          responses: this.responses,
          objectives: this.objectives,
          grant: this.grant,
        };
      },
    };
    Goal.count.mockResolvedValueOnce(1);
    Goal.findAll
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([hydratedGoal]);

    const result = await goalDashboardGoals(
      { goal: [] },
      {
        sortBy: 'goalStatus',
        direction: 'asc',
        offset: '0',
        perPage: '10',
      },
    );

    expect(ActivityReportObjective.findAll).not.toHaveBeenCalled();
    expect(result.goalDashboardGoals.count).toBe(1);
    expect(result.goalDashboardGoals.allGoalIds).toEqual([]);
    expect(result.goalDashboardGoals.goalRows[0]).toEqual(expect.objectContaining({
      id: 1,
      name: '(Family Engagement) The recipient will implement family engagement strategies.',
      grant: expect.objectContaining({
        number: '22RE220001 - HS',
        recipient: {
          id: 30,
          name: 'Children and Families First',
        },
      }),
    }));

    expect(Goal.count).toHaveBeenCalledWith(expect.objectContaining({
      distinct: true,
      col: 'id',
    }));
    expect(Goal.findAll).toHaveBeenNthCalledWith(1, expect.objectContaining({
      attributes: expect.arrayContaining(['id']),
      group: [
        'Goal.id',
        'Goal.name',
        'Goal.createdAt',
        'Goal.status',
        'goalTemplate.id',
        'goalTemplate.standard',
      ],
      limit: 10,
      offset: 0,
      raw: true,
      subQuery: false,
    }));
    const idQuery = Goal.findAll.mock.calls[0][0];
    expect(JSON.stringify(idQuery.attributes)).not.toContain('isReopened');
    expect(JSON.stringify(idQuery.attributes)).not.toContain('SELECT COUNT(*) > 0');
    const hydratedGoalQuery = Goal.findAll.mock.calls[1][0];
    expect(hydratedGoalQuery.where[Op.and][0][Op.and]).toEqual(expect.arrayContaining([
      { prestandard: false },
      { createdAt: { [Op.gte]: '2025-09-09' } },
      {
        status: {
          [Op.in]: ['Not Started', 'In Progress', 'Closed', 'Suspended'],
        },
      },
    ]));
    expect(hydratedGoalQuery.where[Op.and]).toEqual(expect.arrayContaining([
      { id: [1] },
    ]));
    expect(hydratedGoalQuery.include).toEqual(expect.arrayContaining([
      expect.objectContaining({
        as: 'activityReports',
        required: true,
        where: expect.objectContaining({
          calculatedStatus: 'approved',
        }),
      }),
      expect.objectContaining({
        as: 'grant',
        include: expect.arrayContaining([
          expect.objectContaining({
            as: 'recipient',
            attributes: ['id', 'name'],
          }),
        ]),
      }),
    ]));
  });

  it('caps perPage and returns no rows when the requested page has no ids', async () => {
    Goal.count.mockResolvedValueOnce(1);
    Goal.findAll.mockResolvedValueOnce([]);

    const result = await goalDashboardGoals(
      { goal: [] },
      {
        offset: '-20',
        perPage: '999',
      },
    );

    expect(Goal.findAll).toHaveBeenCalledTimes(1);
    expect(Goal.findAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 50,
      offset: 0,
    }));
    expect(result.goalDashboardGoals).toEqual({
      count: 1,
      goalRows: [],
      allGoalIds: [],
    });
  });

  it('only returns all goal ids when explicitly requested', async () => {
    const hydratedGoal = {
      id: 2,
      name: 'Goal 2',
      status: 'In Progress',
      createdAt: '2026-02-02',
      goalTemplateId: 11,
      prestandard: false,
      onAR: false,
      onApprovedAR: true,
      standard: 'Family Engagement',
      statusChanges: [],
      responses: [],
      objectives: [],
      grant: {
        id: 21,
        number: '22RE220002 - HS',
        recipientId: 31,
        regionId: 1,
        recipient: { id: 31, name: 'Recipient 2' },
      },
      toJSON() {
        return {
          id: this.id,
          name: this.name,
          status: this.status,
          createdAt: this.createdAt,
          goalTemplateId: this.goalTemplateId,
          prestandard: this.prestandard,
          onAR: this.onAR,
          onApprovedAR: this.onApprovedAR,
          standard: this.standard,
          statusChanges: this.statusChanges,
          responses: this.responses,
          objectives: this.objectives,
          grant: this.grant,
        };
      },
    };
    Goal.count.mockResolvedValueOnce(3);
    Goal.findAll
      .mockResolvedValueOnce([{ id: 2 }])
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }])
      .mockResolvedValueOnce([hydratedGoal]);

    const result = await goalDashboardGoals(
      { goal: [] },
      {
        includeAllGoalIds: 'true',
        offset: '10',
        perPage: '10',
      },
    );

    expect(Goal.findAll).toHaveBeenCalledTimes(3);
    expect(Goal.findAll).toHaveBeenNthCalledWith(2, expect.not.objectContaining({
      limit: expect.any(Number),
      offset: expect.any(Number),
    }));
    expect(result.goalDashboardGoals.allGoalIds).toEqual([1, 2, 3]);
    expect(result.goalDashboardGoals.goalRows).toHaveLength(1);
  });
});
