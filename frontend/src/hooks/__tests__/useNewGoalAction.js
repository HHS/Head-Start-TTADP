import { renderHook, act } from '@testing-library/react-hooks'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import fetchMock from 'fetch-mock'
import useNewGoalAction from '../useNewGoalAction'

describe('useNewGoalAction', () => {
  afterEach(() => {
    fetchMock.restore()
  })

  it('reopens a closed goal', async () => {
    const { result } = renderHook(() => useNewGoalAction())
    const toggleModal = jest.fn()

    const goalIds = [1]

    const data = {
      useOhsInitiativeGoal: false,
      goalIds,
      goalStatus: GOAL_STATUS.CLOSED,
      selectedGrant: { id: 1 },
      goalTemplate: null,
      goalName: 'Test Goal',
      reason: 'Test Reason',
      context: 'Test Context',
      modalRef: { current: { toggleModal } },
    }

    fetchMock.put('/api/goals/reopen', { id: 1 })

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(toggleModal).toHaveBeenCalledWith(false)

    expect(response).toEqual([1])
  })
  it('handles an error to reopen a closed goal', async () => {
    const { result } = renderHook(() => useNewGoalAction())
    const toggleModal = jest.fn()

    const goalIds = [1]

    const data = {
      useOhsInitiativeGoal: false,
      goalIds,
      goalStatus: GOAL_STATUS.CLOSED,
      selectedGrant: { id: 1 },
      goalTemplate: null,
      goalName: 'Test Goal',
      reason: 'Test Reason',
      context: 'Test Context',
      modalRef: { current: { toggleModal } },
    }

    fetchMock.put('/api/goals/reopen', 500)

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(toggleModal).toHaveBeenCalledWith(false)

    expect(response).toEqual([])
  })
  it('unsuspends a suspended goal', async () => {
    const { result } = renderHook(() => useNewGoalAction())

    const goalIds = [1]

    const data = {
      useOhsInitiativeGoal: false,
      goalIds,
      goalStatus: GOAL_STATUS.SUSPENDED,
      selectedGrant: { id: 1 },
      goalTemplate: null,
      goalName: 'Test Goal',
      reason: 'Test Reason',
      context: 'Test Context',
    }

    fetchMock.put('/api/goals/changeStatus', [{ id: 1 }])

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(response).toEqual([1])
  })
  it('handles an error to unsuspend a suspended goal', async () => {
    const { result } = renderHook(() => useNewGoalAction())
    const goalIds = [1]

    const data = {
      useOhsInitiativeGoal: false,
      goalIds,
      goalStatus: GOAL_STATUS.SUSPENDED,
      selectedGrant: { id: 1 },
      goalTemplate: null,
      goalName: 'Test Goal',
      reason: 'Test Reason',
      context: 'Test Context',
    }

    fetchMock.put('/api/goals/changeStatus', 500)

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(response).toEqual([])
  })

  it('creates a goal from template', async () => {
    const { result } = renderHook(() => useNewGoalAction())

    const data = {
      useOhsInitiativeGoal: true,
      goalIds: [],
      goalStatus: null,
      selectedGrant: { id: 1 },
      goalTemplate: { id: 1 },
    }

    fetchMock.post('/api/goals/template/1', [1])

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(response).toEqual([1])
  })
  it('handles an error to create a goal from template', async () => {
    const { result } = renderHook(() => useNewGoalAction())

    const data = {
      useOhsInitiativeGoal: true,
      goalIds: [],
      goalStatus: null,
      selectedGrant: { id: 1 },
      goalTemplate: { id: 1 },
    }

    fetchMock.post('/api/goals/template/1', 500)

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(response).toEqual([])
  })

  it('does not attempt to create a goal from template if there is no goal template selected', async () => {
    const { result } = renderHook(() => useNewGoalAction())

    const data = {
      useOhsInitiativeGoal: true,
      goalIds: [],
      goalStatus: null,
      selectedGrant: { id: 1 },
      goalTemplate: null,
    }

    const templateUrl = '/api/goals/template/1'
    fetchMock.post(templateUrl, 500)

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(fetchMock.called(templateUrl)).toBe(false)

    expect(response).toEqual([])
  })

  it('updates an existing goal', async () => {
    const { result } = renderHook(() => useNewGoalAction())
    const goalsUrl = '/api/goals'
    const data = {
      useOhsInitiativeGoal: false,
      goalName: 'This is a brand new goal',
      goalIds: [],
      goalStatus: null,
      selectedGrant: { id: 1 },
      goalTemplate: null,
    }

    fetchMock.post(goalsUrl, [{ id: 1 }])

    let response
    await act(async () => {
      response = await result.current(1, 1, true, data)
    })

    expect(response).toEqual([1])
  })

  it('handles an error to an existing goal', async () => {
    const { result } = renderHook(() => useNewGoalAction())
    const goalsUrl = '/api/goals'
    const data = {
      useOhsInitiativeGoal: false,
      goalName: 'This is a brand new goal',
      goalIds: [],
      goalStatus: null,
      selectedGrant: { id: 1 },
      goalTemplate: null,
    }

    fetchMock.post(goalsUrl, 500)

    let response
    await act(async () => {
      response = await result.current(1, 1, true, data)
    })

    expect(response).toEqual([])
  })

  it('creates a goal name from scratch', async () => {
    const { result } = renderHook(() => useNewGoalAction())
    const goalsUrl = '/api/goals'
    const data = {
      useOhsInitiativeGoal: false,
      goalName: 'This is a brand new goal',
      goalIds: [],
      goalStatus: null,
      selectedGrant: { id: 1 },
      goalTemplate: null,
    }

    fetchMock.post(goalsUrl, [{ id: 1 }])

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(response).toEqual([1])
  })

  it('handles an error to create a goal name from scratch', async () => {
    const { result } = renderHook(() => useNewGoalAction())
    const goalsUrl = '/api/goals'
    const data = {
      useOhsInitiativeGoal: false,
      goalName: 'This is a brand new goal',
      goalIds: [],
      goalStatus: null,
      selectedGrant: { id: 1 },
      goalTemplate: null,
    }

    fetchMock.post(goalsUrl, 500)

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(response).toEqual([])
  })

  it('returns an empty array if called with bad data', async () => {
    const { result } = renderHook(() => useNewGoalAction())
    const data = {
      useOhsInitiativeGoal: false,
      goalName: '',
      goalIds: [],
      goalStatus: null,
      selectedGrant: { id: 1 },
      goalTemplate: null,
    }

    let response
    await act(async () => {
      response = await result.current(1, 1, false, data)
    })

    expect(response).toEqual([])
  })
})
