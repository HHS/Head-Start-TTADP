import { renderHook } from '@testing-library/react-hooks';
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
    goals: [{ id: 1, name: 'Goal 1' }],
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

    const { result, waitForNextUpdate } = renderHook(() => useGoalTemplates(mockGrants, true));
    expect(result.current).toBeNull();
    await waitForNextUpdate();
    expect(result.current).toEqual([mockTemplates[0]]);
    expect(result.current.length).toBe(1);
    expect(result.current[0].goals).toHaveLength(0);
  });

  it('returns empty array on error', async () => {
    fetchMock.get('/api/goal-templates?grantIds=123&grantIds=456', 500);

    const { result, waitForNextUpdate } = renderHook(() => useGoalTemplates(mockGrants));
    expect(result.current).toBeNull();
    await waitForNextUpdate();
    expect(result.current).toEqual([]);
  });

  it('does not fetch if grants array is empty or invalid', () => {
    const { result } = renderHook(() => useGoalTemplates([]));
    expect(result.current).toBeNull();
    const { result: result2 } = renderHook(() => useGoalTemplates([{}]));
    expect(result2.current).toBeNull();
  });
});
