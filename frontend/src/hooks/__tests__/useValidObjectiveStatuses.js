import { renderHook } from '@testing-library/react-hooks'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import useValidObjectiveStatuses from '../useValidObjectiveStatuses'
import { OBJECTIVE_STATUS } from '../../Constants'

describe('useValidObjectiveStatuses', () => {
  it('returns read-only options when goal is closed', () => {
    const goalStatus = GOAL_STATUS.CLOSED
    const userCanEdit = true
    const currentStatus = OBJECTIVE_STATUS.IN_PROGRESS

    const { result } = renderHook(() => useValidObjectiveStatuses(goalStatus, userCanEdit, currentStatus))

    const [options, isReadOnly] = result.current

    expect(options).toEqual([OBJECTIVE_STATUS.IN_PROGRESS])
    expect(isReadOnly).toBe(true)
  })

  it('returns read-only options when user cannot edit', () => {
    const goalStatus = GOAL_STATUS.IN_PROGRESS
    const userCanEdit = false
    const currentStatus = OBJECTIVE_STATUS.IN_PROGRESS

    const { result } = renderHook(() => useValidObjectiveStatuses(goalStatus, userCanEdit, currentStatus))

    const [options, isReadOnly] = result.current

    expect(options).toEqual([OBJECTIVE_STATUS.IN_PROGRESS])
    expect(isReadOnly).toBe(true)
  })

  it('returns options for complete status', () => {
    const goalStatus = GOAL_STATUS.IN_PROGRESS
    const userCanEdit = true
    const currentStatus = OBJECTIVE_STATUS.COMPLETE

    const { result } = renderHook(() => useValidObjectiveStatuses(goalStatus, userCanEdit, currentStatus))

    const [options, isReadOnly] = result.current

    expect(options).toEqual([OBJECTIVE_STATUS.IN_PROGRESS, OBJECTIVE_STATUS.SUSPENDED, OBJECTIVE_STATUS.COMPLETE])
    expect(isReadOnly).toBe(false)
  })

  it('returns options for other statuses', () => {
    const goalStatus = GOAL_STATUS.IN_PROGRESS
    const userCanEdit = true
    const currentStatus = OBJECTIVE_STATUS.NOT_STARTED

    const { result } = renderHook(() => useValidObjectiveStatuses(goalStatus, userCanEdit, currentStatus))

    const [options, isReadOnly] = result.current

    expect(options).toEqual([OBJECTIVE_STATUS.NOT_STARTED, OBJECTIVE_STATUS.IN_PROGRESS, OBJECTIVE_STATUS.SUSPENDED, OBJECTIVE_STATUS.COMPLETE])
    expect(isReadOnly).toBe(false)
  })
})
