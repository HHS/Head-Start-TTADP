import { act, renderHook } from '@testing-library/react-hooks';
import { OBJECTIVE_STATUS } from '../../Constants';
import useObjectiveStatusMonitor from '../useObjectiveStatusMonitor';

describe('useObjectiveStatusMonitor', () => {
  const objectives = [
    { ids: [1, 2], status: OBJECTIVE_STATUS.COMPLETE },
    { ids: [3, 4], status: OBJECTIVE_STATUS.IN_PROGRESS },
    { ids: [5, 6], status: OBJECTIVE_STATUS.SUSPENDED },
  ];

  it('handles a null initial state', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor());

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(false);
  });

  it('handles a objectives missing ids', () => {
    const badObjectives = [
      { status: OBJECTIVE_STATUS.COMPLETE },
      { ids: [3, 4], status: OBJECTIVE_STATUS.IN_PROGRESS },
      { ids: [5, 6], status: OBJECTIVE_STATUS.SUSPENDED },
      { ids: 7, status: OBJECTIVE_STATUS.COMPLETE },
    ];

    const { result } = renderHook(() => useObjectiveStatusMonitor(badObjectives));

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(true);
  });

  it('handles a bad dispatch call', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(objectives));

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(true);

    act(() => {
      result.current.dispatchStatusChange(null, OBJECTIVE_STATUS.COMPLETE);
    });

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(true);
  });

  it('handles an error in the dispatch', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(null));

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(false);
  });

  it('should initialize with correct initial state', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(objectives));

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(true);
  });

  it('should update objective status and state correctly', async () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(objectives));

    act(() => {
      result.current.dispatchStatusChange([3, 4], OBJECTIVE_STATUS.COMPLETE);
      result.current.dispatchStatusChange([5, 6], OBJECTIVE_STATUS.COMPLETE);
    });

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(false);
  });

  it('should handle unknown objective IDs correctly', () => {
    const localObjectives = [
      { ids: [1, 2], status: OBJECTIVE_STATUS.COMPLETE },
      { ids: [3, 4], status: OBJECTIVE_STATUS.COMPLETE },
      { ids: [5, 6], status: OBJECTIVE_STATUS.COMPLETE },
    ];
    const { result } = renderHook(() => useObjectiveStatusMonitor(localObjectives));

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(false);

    act(() => {
      result.current.dispatchStatusChange([7, 8], OBJECTIVE_STATUS.COMPLETE);
    });

    // Unknown ids are a no-op - aggregate state should be unchanged.
    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(false);
  });

  it('does not mutate the input objectives when status changes', () => {
    const input = [
      { ids: [1, 2], status: OBJECTIVE_STATUS.NOT_STARTED },
      { ids: [3, 4], status: OBJECTIVE_STATUS.IN_PROGRESS },
    ];
    const snapshot = input.map((o) => ({ ids: [...o.ids], status: o.status }));

    const { result } = renderHook(() => useObjectiveStatusMonitor(input));

    act(() => {
      result.current.dispatchStatusChange([1, 2], OBJECTIVE_STATUS.IN_PROGRESS);
      result.current.dispatchStatusChange([3, 4], OBJECTIVE_STATUS.COMPLETE);
    });

    // Objects in the caller's array must be untouched - mutation here caused an
    // infinite render loop in ObjectiveCard when its sync-from-prop effect fought
    // with the local state.
    expect(input[0].status).toBe(snapshot[0].status);
    expect(input[1].status).toBe(snapshot[1].status);
    expect(input[0].ids).toEqual(snapshot[0].ids);
    expect(input[1].ids).toEqual(snapshot[1].ids);
  });
});
