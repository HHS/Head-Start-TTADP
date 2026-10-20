import { renderHook } from '@testing-library/react-hooks';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import fetchMock from 'fetch-mock';
import useGoalTemplates from '../useGoalTemplates';

const mockTemplates = [
  {
    id: 1,
    name: 'Template 1',
    goals: [],
  },
  {
    id: 2,
    name: 'Template 2',
    goals: [
      {
        id: 1,
        name: 'Goal 1',
        prestandard: false,
        status: GOAL_STATUS.NOT_STARTED,
      },
    ],
  },
  {
    id: 3,
    name: 'Template 3',
    goals: [
      {
        id: 2,
        name: 'Goal 2',
        prestandard: true,
        status: GOAL_STATUS.NOT_STARTED,
      },
    ],
  },
  {
    id: 4,
    name: 'Template 4',
    goals: [
      {
        id: 3,
        name: 'Goal 3',
        prestandard: true,
        status: GOAL_STATUS.NOT_STARTED,
      },
      {
        id: 4,
        name: 'Goal 4',
        prestandard: true,
        status: GOAL_STATUS.IN_PROGRESS,
      },
    ],
  },
  {
    id: 5,
    name: 'Template 5',
    goals: [
      {
        id: 5,
        name: 'Goal 5',
        prestandard: true,
        status: GOAL_STATUS.NOT_STARTED,
      },
      {
        id: 6,
        name: 'Goal 6',
        prestandard: false,
        status: GOAL_STATUS.NOT_STARTED,
      },
    ],
  },
  {
    id: 6,
    name: 'Template 6',
    goals: [
      {
        id: 7,
        name: 'Goal 7',
        prestandard: false,
        status: GOAL_STATUS.NOT_STARTED,
      },
    ],
    blockingActivityReports: [
      {
        displayId: 'R14-AR-67433',
        creatorName: 'Annika Lewis, GS',
        href: '/activity-reports/123',
      },
    ],
  },
  {
    id: 7,
    name: 'Template 7',
    goals: [
      {
        id: 8,
        name: 'Existing RTTAPA goal',
        prestandard: false,
        status: GOAL_STATUS.IN_PROGRESS,
      },
    ],
    blockingActivityReports: [],
  },
];

const mockGrants = [
  { id: 123, name: 'Grant 1' },
  { id: 456, name: 'Grant 2' },
];

describe('useGoalTemplates', () => {
  beforeEach(() => {
    fetchMock.reset();
  });

  it('fetches goal templates when grants are provided', async () => {
    fetchMock.get('/api/goal-templates?grantIds=123&grantIds=456', mockTemplates);

    const { result, waitForNextUpdate } = renderHook(() => useGoalTemplates(mockGrants));
    expect(result.current).toBeNull();
    await waitForNextUpdate();
    expect(result.current).toEqual(mockTemplates);
  });

  it('filters out used templates when filterOutUsedTemplates is true', async () => {
    fetchMock.get('/api/goal-templates?grantIds=123&grantIds=456', mockTemplates);

    const { result, waitForNextUpdate } = renderHook(() =>
      useGoalTemplates(mockGrants, { filterOutUsedTemplates: true })
    );
    expect(result.current).toBeNull();
    await waitForNextUpdate();

    // Should keep templates with no goals AND templates where all goals are prestandard
    expect(result.current).toEqual([
      mockTemplates[0],
      mockTemplates[2],
      mockTemplates[3],
      mockTemplates[5],
    ]);
    expect(result.current.length).toBe(4);
    expect(result.current[0].goals).toHaveLength(0); // Template 1: no goals
    expect(result.current[1].goals).toHaveLength(1); // Template 3: one prestandard goal
    expect(result.current[1].goals[0].prestandard).toBe(true);
    expect(result.current[2].goals).toHaveLength(2); // Template 4: multiple prestandard goals
    expect(result.current[2].goals.every((goal) => goal.prestandard === true)).toBe(true);
    expect(result.current[3].blockingActivityReports).toHaveLength(1);
  });

  it('keeps a hidden activity report goal selectable when blocker details are present', async () => {
    fetchMock.get('/api/goal-templates?grantIds=123&grantIds=456', mockTemplates);

    const { result, waitForNextUpdate } = renderHook(() =>
      useGoalTemplates(mockGrants, { filterOutUsedTemplates: true })
    );
    await waitForNextUpdate();

    expect(result.current).toContainEqual(mockTemplates[5]);
  });

  it('correctly excludes templates with any non-prestandard goals', async () => {
    fetchMock.get('/api/goal-templates?grantIds=123&grantIds=456', mockTemplates);

    const { result, waitForNextUpdate } = renderHook(() =>
      useGoalTemplates(mockGrants, { filterOutUsedTemplates: true })
    );
    expect(result.current).toBeNull();
    await waitForNextUpdate();

    const filteredTemplates = result.current;
    // Should exclude templates with any non-prestandard goals
    // Template with non-prestandard goal
    expect(filteredTemplates).not.toContainEqual(mockTemplates[1]);
    // Mixed prestandard and non-prestandard goals should be excluded
    expect(filteredTemplates).not.toContainEqual(mockTemplates[4]);
    // An ordinary RTTAPA goal remains excluded when no blocker enrichment is present.
    expect(filteredTemplates).not.toContainEqual(mockTemplates[6]);
  });

  it('returns empty array on error', async () => {
    fetchMock.get('/api/goal-templates?grantIds=123&grantIds=456', 500);

    const { result, waitForNextUpdate } = renderHook(() => useGoalTemplates(mockGrants));
    expect(result.current).toBeNull();
    await waitForNextUpdate();
    expect(result.current).toEqual([]);
  });

  it('fetches global templates when an intentionally empty grants array is provided', async () => {
    fetchMock.get('/api/goal-templates', mockTemplates);

    const { result, waitForNextUpdate } = renderHook(() => useGoalTemplates([]));
    expect(result.current).toBeNull();
    await waitForNextUpdate();

    expect(result.current).toEqual(mockTemplates);
    expect(fetchMock.called('/api/goal-templates')).toBe(true);
  });

  it('does not fetch when the selected grant is unresolved', () => {
    const { result } = renderHook(() => useGoalTemplates([{}]));

    expect(result.current).toBeNull();
    expect(fetchMock.calls()).toHaveLength(0);
  });

  it('requests closed goals and blocking report enrichment when specified', async () => {
    fetchMock.get(
      '/api/goal-templates?grantIds=123&grantIds=456&includeClosedSuspendedGoals=true&includeBlockingActivityReports=true',
      mockTemplates
    );

    const { result, waitForNextUpdate } = renderHook(() =>
      useGoalTemplates(mockGrants, {
        includeBlockingActivityReports: true,
        includeClosedSuspendedGoals: true,
      })
    );
    expect(result.current).toBeNull();
    await waitForNextUpdate();
    expect(result.current).toEqual(mockTemplates);
  });
});
