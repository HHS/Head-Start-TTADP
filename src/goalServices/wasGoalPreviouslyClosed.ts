import { GOAL_STATUS } from '../constants'

export default function wasGoalPreviouslyClosed(goal: { statusChanges?: { oldStatus: string }[] }) {
  if (goal.statusChanges) {
    return goal.statusChanges.some((statusChange) => statusChange.oldStatus === GOAL_STATUS.CLOSED)
  }

  return false
}
