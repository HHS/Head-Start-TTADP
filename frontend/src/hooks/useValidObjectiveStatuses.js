import { useMemo } from 'react';

export default function useValidObjectiveStatuses(goalStatus, userCanEdit, currentStatus) {
  // if the goal is closed or not started, the objective status should be read-only
  const isReadOnly = useMemo(() => {
    if (['Closed'].includes(goalStatus) || !userCanEdit) {
      return true;
    }

    return false;
  }, [goalStatus, userCanEdit]);

  const options = useMemo(() => {
    if (isReadOnly) {
      return [
        currentStatus,
      ];
    }

    if (currentStatus === 'Complete') {
      return [
        'In Progress',
        'Suspended',
        'Complete',
      ];
    }

    // otherwise all the options should be available
    return [
      'Not Started',
      'In Progress',
      'Suspended',
      'Complete',
    ];
  }, [currentStatus, isReadOnly]);

  return [options, isReadOnly];
}
