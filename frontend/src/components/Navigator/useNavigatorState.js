/* eslint-disable react/jsx-props-no-spreading */
import { useCallback } from 'react'
import { IN_PROGRESS, COMPLETE } from './constants'

const GOALS_AND_OBJECTIVES_POSITION = 2

/**
 * Custom hook to manage navigator page state logic for the Activity Report navigator.
 *
 * @param {Object} params
 * @param {Object} params.pageState - current RHF pageState watch value
 * @param {Object} params.page - current page object
 * @param {Object} params.goalsAndObjectivesPage - page object for goals & objectives
 * @param {Function} params.getValues - react-hook-form getValues
 * @param {Object} params.formState - react-hook-form formState
 * @param {boolean} params.isDirty - react-hook-form isDirty
 * @param {boolean} params.isValid - react-hook-form isValid
 * @param {Function} params.setValue - react-hook-form setValue
 * @param {number} params.goalsAndObjectivesPosition - numeric position of goals & objectives page
 */
export default function useNavigatorState({ page, goalsAndObjectivesPage, hookForm }) {
  const { getValues, formState, setValue, watch } = hookForm
  const { isDirty, isValid } = formState
  const pageState = watch('pageState')

  const recalculatePageState = useCallback(() => {
    const newPageState = { ...pageState }
    const currentGoalsObjectivesPageState = pageState[GOALS_AND_OBJECTIVES_POSITION]
    const pageCompleteFunc = goalsAndObjectivesPage.isPageComplete
    const isGoalsObjectivesPageComplete = pageCompleteFunc(getValues(), formState)
    const isCurrentPageGoalsObjectives = page.position === GOALS_AND_OBJECTIVES_POSITION
    const goalForEditing = getValues('goalForEditing')

    // If a goal is being edited, the page CANNOT be complete regardless of current page
    // This ensures the page state shows "In Progress" even
    // after navigating away from goals-objectives
    if (goalForEditing) {
      newPageState[GOALS_AND_OBJECTIVES_POSITION] = IN_PROGRESS
    } else if (isGoalsObjectivesPageComplete) {
      newPageState[GOALS_AND_OBJECTIVES_POSITION] = COMPLETE
    } else if (isCurrentPageGoalsObjectives && currentGoalsObjectivesPageState === COMPLETE) {
      newPageState[GOALS_AND_OBJECTIVES_POSITION] = IN_PROGRESS
    } else if (isCurrentPageGoalsObjectives) {
      // eslint-disable-next-line max-len
      newPageState[GOALS_AND_OBJECTIVES_POSITION] = isDirty ? IN_PROGRESS : currentGoalsObjectivesPageState
    }

    return newPageState
  }, [formState, getValues, goalsAndObjectivesPage, isDirty, page.position, pageState])

  /**
   * Updates the goals & objectives page state based on current form values
   * This ensures that after any API call (like recipient changes that remove goals)
   * we update the page state appropriately
   * @param {Object} savedData - The data returned from the save operation
   */
  const updateGoalsObjectivesPageState = useCallback(
    (savedData) => {
      if (!goalsAndObjectivesPage || !savedData) return

      // If a goal is being edited, the page is always IN_PROGRESS regardless of validation
      const hasGoalBeingEdited = savedData && savedData.goalForEditing

      // Re-validate the goals and objectives page using saved data
      const isGoalsObjectivesPageComplete = goalsAndObjectivesPage.isPageComplete(savedData, formState)

      // Desired state for the goals/objectives page
      // If a goal is being edited, force IN_PROGRESS state
      const completionState = isGoalsObjectivesPageComplete ? COMPLETE : IN_PROGRESS
      const desiredState = hasGoalBeingEdited ? IN_PROGRESS : completionState

      // Update RHF's pageState
      const mergedPageState = {
        ...savedData.pageState,
        [GOALS_AND_OBJECTIVES_POSITION]: desiredState,
      }

      setValue('pageState', mergedPageState)
    },
    [formState, goalsAndObjectivesPage, setValue]
  )

  const newNavigatorState = useCallback(() => {
    const newPageState = recalculatePageState()

    if (page.review || page.position === GOALS_AND_OBJECTIVES_POSITION) {
      return newPageState
    }

    const currentPageState = pageState[page.position]
    const isComplete = page.isPageComplete ? page.isPageComplete(getValues(), formState) : isValid

    if (isComplete) {
      newPageState[page.position] = COMPLETE
    } else if (currentPageState === COMPLETE) {
      newPageState[page.position] = IN_PROGRESS
    } else {
      newPageState[page.position] = isDirty ? IN_PROGRESS : currentPageState
    }

    return newPageState
  }, [formState, getValues, isDirty, isValid, page, pageState, recalculatePageState])

  return { newNavigatorState, updateGoalsObjectivesPageState }
}
