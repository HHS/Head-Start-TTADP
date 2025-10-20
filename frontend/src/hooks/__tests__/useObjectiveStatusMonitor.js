import { renderHook, act } from '@testing-library/react-hooks';
import useObjectiveStatusMonitor from '../useObjectiveStatusMonitor';
import { OBJECTIVE_STATUS } from '../../Constants';

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
    const { result } = renderHook(() => useObjectiveStatusMonitor(objectives));

    act(() => {
      result.current.dispatchStatusChange([7, 8], OBJECTIVE_STATUS.COMPLETE);
    });

    expect(result.current.atLeastOneObjectiveIsNotCompleted).toBe(false);
  });
});
