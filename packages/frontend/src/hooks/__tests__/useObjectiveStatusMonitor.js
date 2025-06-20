import { renderHook, act } from '@testing-library/react-hooks';
import useObjectiveStatusMonitor from '../useObjectiveStatusMonitor';

describe('useObjectiveStatusMonitor', () => {
  const objectives = [
    { ids: [1, 2], status: 'Complete' },
    { ids: [3, 4], status: 'In Progress' },
    { ids: [5, 6], status: 'Suspended' },
  ];

  it('handles a null initial state', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor());

    expect(result.current.atLeastOneObjectiveIsNotCompletedOrSuspended).toBe(false);
  });

  it('handles a objectives missing ids', () => {
    const badObjectives = [
      { status: 'Complete' },
      { ids: [3, 4], status: 'In Progress' },
      { ids: [5, 6], status: 'Suspended' },
      { ids: 7, status: 'Complete' },
    ];

    const { result } = renderHook(() => useObjectiveStatusMonitor(badObjectives));

    expect(result.current.atLeastOneObjectiveIsNotCompletedOrSuspended).toBe(true);
  });

  it('handles a bad dispatch call', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(objectives));

    expect(result.current.atLeastOneObjectiveIsNotCompletedOrSuspended).toBe(true);

    act(() => {
      result.current.dispatchStatusChange(null, 'Complete');
    });

    expect(result.current.atLeastOneObjectiveIsNotCompletedOrSuspended).toBe(true);
  });

  it('handles an error in the dispatch', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(null));

    expect(result.current.atLeastOneObjectiveIsNotCompletedOrSuspended).toBe(false);
  });

  it('should initialize with correct initial state', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(objectives));

    expect(result.current.atLeastOneObjectiveIsNotCompletedOrSuspended).toBe(true);
  });

  it('should update objective status and state correctly', async () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(objectives));

    act(() => {
      result.current.dispatchStatusChange([3, 4], 'Complete');
    });

    expect(result.current.atLeastOneObjectiveIsNotCompletedOrSuspended).toBe(false);
  });

  it('should handle unknown objective IDs correctly', () => {
    const { result } = renderHook(() => useObjectiveStatusMonitor(objectives));

    act(() => {
      result.current.dispatchStatusChange([7, 8], 'Complete');
    });

    expect(result.current.atLeastOneObjectiveIsNotCompletedOrSuspended).toBe(false);
  });
});
