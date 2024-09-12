import { renderHook } from '@testing-library/react-hooks';
import useValidObjectiveStatuses from '../useValidObjectiveStatuses';

describe('useValidObjectiveStatuses', () => {
  it('returns read-only options when goal is closed', () => {
    const goalStatus = 'Closed';
    const userCanEdit = true;
    const currentStatus = 'In Progress';

    const { result } = renderHook(() => useValidObjectiveStatuses(
      goalStatus, userCanEdit, currentStatus,
    ));

    const [options, isReadOnly] = result.current;

    expect(options).toEqual(['In Progress']);
    expect(isReadOnly).toBe(true);
  });

  it('returns read-only options when user cannot edit', () => {
    const goalStatus = 'In Progress';
    const userCanEdit = false;
    const currentStatus = 'In Progress';

    const { result } = renderHook(() => useValidObjectiveStatuses(
      goalStatus, userCanEdit, currentStatus,
    ));

    const [options, isReadOnly] = result.current;

    expect(options).toEqual(['In Progress']);
    expect(isReadOnly).toBe(true);
  });

  it('returns options for complete status', () => {
    const goalStatus = 'In Progress';
    const userCanEdit = true;
    const currentStatus = 'Complete';

    const { result } = renderHook(() => useValidObjectiveStatuses(
      goalStatus, userCanEdit, currentStatus,
    ));

    const [options, isReadOnly] = result.current;

    expect(options).toEqual(['In Progress', 'Suspended', 'Complete']);
    expect(isReadOnly).toBe(false);
  });

  it('returns options for other statuses', () => {
    const goalStatus = 'In Progress';
    const userCanEdit = true;
    const currentStatus = 'Not Started';

    const { result } = renderHook(() => useValidObjectiveStatuses(
      goalStatus, userCanEdit, currentStatus,
    ));

    const [options, isReadOnly] = result.current;

    expect(options).toEqual([
      'Not Started',
      'In Progress',
      'Suspended',
      'Complete',
    ]);
    expect(isReadOnly).toBe(false);
  });
});
