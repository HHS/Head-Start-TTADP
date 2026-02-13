import { renderHook, act } from '@testing-library/react-hooks'
import { useHistory } from 'react-router'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import useGoalState from '../useGoalState'
import useNewGoalAction from '../useNewGoalAction'
import {
  GOAL_FORM_BUTTON_LABELS,
  GOAL_FORM_BUTTON_TYPES,
  GOAL_FORM_BUTTON_VARIANTS,
  NEW_GOAL_FORM_PAGES,
} from '../../components/SharedGoalComponents/constants'

jest.mock('../useNewGoalAction')
jest.mock('react-router')

describe('useGoalState', () => {
  it('returns default values', async () => {
    const { result } = renderHook(() => useGoalState({ id: 1 }, 1))

    expect(result.current.page).toBe(NEW_GOAL_FORM_PAGES.INITIAL)
    expect(result.current.error).toBe(null)
    expect(result.current.buttons).toEqual([
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.SAVE_AND_CONTINUE,
        type: GOAL_FORM_BUTTON_TYPES.SUBMIT,
        variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
      },
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.CANCEL,
        to: '/recipient-tta-records/1/region/1/rttapa/',
        type: GOAL_FORM_BUTTON_TYPES.LINK,
        variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      },
    ])
  })

  it('submit on initial increments the page to confirmation', async () => {
    const { result } = renderHook(() => useGoalState({ id: 1 }, 1))

    expect(result.current.page).toBe(NEW_GOAL_FORM_PAGES.INITIAL)

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.page).toBe(NEW_GOAL_FORM_PAGES.CONFIRMATION)
    expect(result.current.error).toBe(null)
    expect(result.current.buttons).toEqual([
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.GO_TO_EXISTING,
        type: GOAL_FORM_BUTTON_TYPES.SUBMIT,
        variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
      },
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.BACK,
        onClick: expect.any(Function),
        type: GOAL_FORM_BUTTON_TYPES.BUTTON,
        variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      },
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.CANCEL,
        to: '/recipient-tta-records/1/region/1/rttapa/',
        type: GOAL_FORM_BUTTON_TYPES.LINK,
        variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      },
    ])
  })

  it('user can proceed to create a new goal, ignoring suggestions and templates', async () => {
    const action = jest.fn(() => [1, 2])
    useNewGoalAction.mockReturnValue(action)

    const push = jest.fn()
    useHistory.mockReturnValue({ push })

    const { result } = renderHook(() => useGoalState({ id: 1 }, 1))

    act(() => {
      result.current.hookForm.setValue('goalName', 'A brand new goal')
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(push).toHaveBeenCalledWith('/recipient-tta-records/1/region/1/goals/edit?id[]=1,2')
  })

  it('closed goal confirmation page has different data', async () => {
    const { result } = renderHook(() => useGoalState({ id: 1 }, 1))

    expect(result.current.page).toBe(NEW_GOAL_FORM_PAGES.INITIAL)

    act(() => {
      result.current.hookForm.setValue('goalStatus', GOAL_STATUS.CLOSED)
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.page).toBe(NEW_GOAL_FORM_PAGES.CONFIRMATION)
    expect(result.current.error).toBe(null)
    expect(result.current.buttons).toEqual([
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.GO_TO_EXISTING,
        type: GOAL_FORM_BUTTON_TYPES.MODAL_OPENER,
        variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
      },
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.BACK,
        onClick: expect.any(Function),
        type: GOAL_FORM_BUTTON_TYPES.BUTTON,
        variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      },
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.CANCEL,
        to: '/recipient-tta-records/1/region/1/rttapa/',
        type: GOAL_FORM_BUTTON_TYPES.LINK,
        variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      },
    ])
  })

  it('submitting on confirmation causes the action function to be fired', async () => {
    const action = jest.fn(() => [1, 2])
    useNewGoalAction.mockReturnValue(action)

    const push = jest.fn()
    useHistory.mockReturnValue({ push })

    const { result } = renderHook(() => useGoalState({ id: 1 }, 1))

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.page).toBe(NEW_GOAL_FORM_PAGES.CONFIRMATION)

    await act(async () => {
      await result.current.submit()
    })

    expect(push).toHaveBeenCalledWith('/recipient-tta-records/1/region/1/goals/edit?id[]=1,2')
  })

  it('action returning no ids sets an error', async () => {
    const action = jest.fn(() => [])
    useNewGoalAction.mockReturnValue(action)

    const push = jest.fn()
    useHistory.mockReturnValue({ push })

    const { result } = renderHook(() => useGoalState({ id: 1 }, 1))

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.page).toBe(NEW_GOAL_FORM_PAGES.CONFIRMATION)

    await act(async () => {
      await result.current.submit()
    })

    expect(push).not.toHaveBeenCalledWith()
    expect(result.current.error).toBe('Sorry, something went wrong')
  })

  it('using an existing initative goal shows the confirmation page', async () => {
    const action = jest.fn(() => [1, 2])
    useNewGoalAction.mockReturnValue(action)

    const push = jest.fn()
    useHistory.mockReturnValue({ push })

    const { result } = renderHook(() => useGoalState({ id: 1 }, 1))

    act(() => {
      result.current.hookForm.setValue('useOhsInitiativeGoal', true)
    })

    await act(async () => {
      await result.current.submit({
        goalTemplate: { goals: [{ id: 1, status: GOAL_STATUS.IN_PROGRESS }] },
      })
    })

    expect(result.current.page).toBe(NEW_GOAL_FORM_PAGES.CONFIRMATION)
    expect(result.current.error).toBe(null)
    expect(result.current.buttons).toEqual([
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.GO_TO_EXISTING,
        type: GOAL_FORM_BUTTON_TYPES.SUBMIT,
        variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
      },
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.BACK,
        onClick: expect.any(Function),
        type: GOAL_FORM_BUTTON_TYPES.BUTTON,
        variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      },
      {
        id: expect.any(String),
        label: GOAL_FORM_BUTTON_LABELS.CANCEL,
        to: '/recipient-tta-records/1/region/1/rttapa/',
        type: GOAL_FORM_BUTTON_TYPES.LINK,
        variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      },
    ])
  })
  it('creating a new iniative goal skips confirmation and goes to new goal form', async () => {
    const action = jest.fn(() => [999])
    useNewGoalAction.mockReturnValue(action)

    const push = jest.fn()
    useHistory.mockReturnValue({ push })

    const { result } = renderHook(() => useGoalState({ id: 1 }, 1))

    act(() => {
      result.current.hookForm.setValue('useOhsInitiativeGoal', true)
    })

    await act(async () => {
      await result.current.submit({ goalTemplate: { goals: [] } })
    })

    expect(push).toHaveBeenCalledWith('/recipient-tta-records/1/region/1/goals/edit?id[]=999')
  })
})
