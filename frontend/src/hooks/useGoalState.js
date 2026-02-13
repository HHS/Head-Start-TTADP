import React, { useState, useCallback, useMemo, useRef } from 'react'
import { uniqueId } from 'lodash'
import { useForm } from 'react-hook-form'
import { useHistory } from 'react-router'
import { GOAL_STATUS } from '@ttahub/common'
import {
  GOAL_FORM_BUTTON_LABELS,
  GOAL_FORM_BUTTON_TYPES,
  GOAL_FORM_BUTTON_VARIANTS,
  NEW_GOAL_FORM_PAGES,
} from '../components/SharedGoalComponents/constants'
import NewGoalAlert from '../components/SharedGoalComponents/NewGoalAlert'
import useNewGoalAction from './useNewGoalAction'

// TODO: this file can be removed once standard goals are launched

export default function useGoalState(recipient, regionId, isExistingGoal = false) {
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      goalIds: [], // the goal ids that the user has selected
      selectedGrant: null, // the grant that the user has selected
      goalName: '', // the goal name in the textbox
      goalStatus: '', // the status of the goal, only tracked to display in alerts
      goalSource: '', // only used for curated templates
      goalStatusReason: '',
      useOhsInitiativeGoal: false, // the checkbox to toggle the controls
      isGoalNameEditable: true,
    },
    shouldUnregister: false,
  })

  const action = useNewGoalAction()

  const modalRef = useRef(null)
  const { setValue, watch } = hookForm
  const { goalStatus, goalStatusReason, goalIds, useOhsInitiativeGoal, goalName } = watch()
  const [page, setPage] = useState(NEW_GOAL_FORM_PAGES.INITIAL)
  const [error, setError] = useState(null)

  const history = useHistory()
  const forwardToGoalWithIds = useCallback(
    (ids) => {
      if (!ids.length) {
        setError('Sorry, something went wrong')
        return
      }
      const urlFragment = `id[]=${ids.join(',')}`
      const url = `/recipient-tta-records/${recipient.id}/region/${regionId}/goals/edit?${urlFragment}`
      history.push(url)
    },
    [history, recipient.id, regionId]
  )

  // this memoized object will hold the position and particulars
  // for each page of the form (alert, buttons, and submit function)
  // the actual data will be held in the form context
  const pageState = useMemo(
    () => ({
      [NEW_GOAL_FORM_PAGES.INITIAL]: {
        alert: null,
        buttons: [
          {
            id: uniqueId('goal-form-button-'),
            type: GOAL_FORM_BUTTON_TYPES.SUBMIT,
            variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
            label: GOAL_FORM_BUTTON_LABELS.SAVE_AND_CONTINUE,
          },
          {
            id: uniqueId('goal-form-button-'),
            type: GOAL_FORM_BUTTON_TYPES.LINK,
            variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
            label: GOAL_FORM_BUTTON_LABELS.CANCEL,
            to: `/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`,
          },
        ],
        submit: async (data) => {
          // determine whether a new goal text has been used
          const isCreatingNewGoal = goalName && !goalIds.length && !useOhsInitiativeGoal

          // determine whether an existing OHS initiative goal is being used
          const existingOhsInitiativeGoal = (() => {
            if (!useOhsInitiativeGoal) {
              return false
            }

            // if we have a goal template selected, then we are using an existing goal - return it
            // eslint-disable-next-line max-len
            return data.goalTemplate && data.goalTemplate.goals.length ? data.goalTemplate.goals[0] : false
          })()

          setValue('isGoalNameEditable', false)

          // isExistingGoal refers to whether this hook is used on an existing goal edit form
          // not to whether the goal already exists in the new goal form
          // (comment here acknowledging that is a bit confusing)
          // eslint-disable-next-line max-len
          if (isExistingGoal || isCreatingNewGoal || (useOhsInitiativeGoal && !existingOhsInitiativeGoal)) {
            const ids = await action(recipient.id, regionId, isExistingGoal, data)
            forwardToGoalWithIds(ids)
            return
          }

          if (existingOhsInitiativeGoal) {
            // we need to update the status in the form to refer to the existing goal
            setValue('goalStatus', existingOhsInitiativeGoal.status)
          }

          setPage(NEW_GOAL_FORM_PAGES.CONFIRMATION)
        },
      },
      [NEW_GOAL_FORM_PAGES.CONFIRMATION]: {
        alert: {
          message: <NewGoalAlert goalStatus={goalStatus} goalStatusReason={goalStatusReason} />,
        },
        buttons: [
          (() => {
            if (goalStatus === GOAL_STATUS.CLOSED) {
              return {
                id: uniqueId('goal-form-button-'),
                type: GOAL_FORM_BUTTON_TYPES.MODAL_OPENER,
                variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
                label: GOAL_FORM_BUTTON_LABELS.GO_TO_EXISTING,
              }
            }

            return {
              id: uniqueId('goal-form-button-'),
              type: GOAL_FORM_BUTTON_TYPES.SUBMIT,
              variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
              label: GOAL_FORM_BUTTON_LABELS.GO_TO_EXISTING,
            }
          })(),
          {
            id: uniqueId('goal-form-button-'),
            type: GOAL_FORM_BUTTON_TYPES.BUTTON,
            variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
            label: GOAL_FORM_BUTTON_LABELS.BACK,
            onClick: () => {
              setValue('isGoalNameEditable', true)
              setPage(NEW_GOAL_FORM_PAGES.INITIAL)
            },
          },
          {
            id: uniqueId('goal-form-button-'),
            type: GOAL_FORM_BUTTON_TYPES.LINK,
            variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
            label: GOAL_FORM_BUTTON_LABELS.CANCEL,
            to: `/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`,
          },
        ],
        submit: async (data) => {
          const ids = await action(recipient.id, regionId, isExistingGoal, data)
          forwardToGoalWithIds(ids)
        },
      },
    }),
    [
      isExistingGoal,
      action,
      forwardToGoalWithIds,
      goalIds.length,
      goalName,
      goalStatus,
      goalStatusReason,
      recipient.id,
      regionId,
      setValue,
      useOhsInitiativeGoal,
    ]
  )

  // This function does not fire unless "submit" goes off
  // (which will not happen if the form is invalid, react-hook-form handles this)
  const submit = useCallback(
    async (data) => {
      try {
        await pageState[page].submit(data)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
      }
    },
    [page, pageState]
  )

  return {
    hookForm,
    modalRef,
    buttons: pageState[page].buttons,
    alert: pageState[page].alert,
    submit,
    error,
    page,
  }
}
