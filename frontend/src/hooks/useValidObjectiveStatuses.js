import { GOAL_STATUS } from '@ttahub/common/src/constants'
import { useMemo } from 'react'
import { OBJECTIVE_STATUS } from '../Constants'

export default function useValidObjectiveStatuses(goalStatus, userCanEdit, currentStatus) {
  // if the goal is closed or not started, the objective status should be read-only
  const isReadOnly = useMemo(() => {
    if ([GOAL_STATUS.CLOSED].includes(goalStatus) || !userCanEdit) {
      return true
    }

    return false
  }, [goalStatus, userCanEdit])

  const options = useMemo(() => {
    if (isReadOnly) {
      return [currentStatus]
    }

    if (currentStatus === OBJECTIVE_STATUS.COMPLETE) {
      return [OBJECTIVE_STATUS.IN_PROGRESS, OBJECTIVE_STATUS.SUSPENDED, OBJECTIVE_STATUS.COMPLETE]
    }

    // otherwise all the options should be available
    return [OBJECTIVE_STATUS.NOT_STARTED, OBJECTIVE_STATUS.IN_PROGRESS, OBJECTIVE_STATUS.SUSPENDED, OBJECTIVE_STATUS.COMPLETE]
  }, [currentStatus, isReadOnly])

  return [options, isReadOnly]
}
