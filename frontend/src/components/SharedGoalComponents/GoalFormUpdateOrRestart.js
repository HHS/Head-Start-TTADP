/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import PropTypes from 'prop-types'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import { FormProvider } from 'react-hook-form'
import GoalFormContainer from './GoalFormContainer'
import GoalFormNavigationLink from './GoalFormNavigationLink'
import GoalFormHeading from './GoalFormHeading'
import GoalFormTitleGroup from './GoalFormTitleGroup'
import ReadOnlyField from '../ReadOnlyField'
import GoalFormTemplatePrompts from './GoalFormTemplatePrompts'
import ObjectivesSection from './ObjectivesSection'
import GoalFormButtonIterator from './GoalFormButtonIterator'
import { GOAL_FORM_FIELDS } from '../../pages/StandardGoalForm/constants'
import RestartStandardGoalObjectives from './RestartStandardGoalObjectives'

export default function GoalFormUpdateOrRestart({
  hookForm,
  recipient,
  regionId,
  goal,
  standardGoalFormButtons,
  onSubmit,
  goalTemplatePrompts,
  isRestart,
}) {
  const Objectives = isRestart ? RestartStandardGoalObjectives : ObjectivesSection

  return (
    <FormProvider {...hookForm}>
      <GoalFormNavigationLink recipient={recipient} regionId={regionId} />
      <GoalFormHeading recipient={recipient} regionId={regionId} />
      <GoalFormContainer>
        <GoalFormTitleGroup status={GOAL_STATUS.NOT_STARTED} goalNumbers={[`G-${goal.id}`]} isReopenedGoal={isRestart} />
        <ReadOnlyField label="Recipient grant numbers">{goal.grant.numberWithProgramTypes}</ReadOnlyField>

        <ReadOnlyField label="Recipient's goal">{goal.name}</ReadOnlyField>

        <form onSubmit={hookForm.handleSubmit(onSubmit)}>
          <GoalFormTemplatePrompts goalTemplatePrompts={goalTemplatePrompts} />
          <Objectives fieldName={GOAL_FORM_FIELDS.OBJECTIVES} options={goal.objectives} />
          <GoalFormButtonIterator buttons={standardGoalFormButtons} />
        </form>
      </GoalFormContainer>
    </FormProvider>
  )
}

GoalFormUpdateOrRestart.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  hookForm: PropTypes.object.isRequired,
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        numberWithProgramTypes: PropTypes.string,
      })
    ),
  }).isRequired,
  regionId: PropTypes.string.isRequired,
  goal: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grant: PropTypes.shape({
      numberWithProgramTypes: PropTypes.string,
    }),
    objectives: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        title: PropTypes.string,
      })
    ),
  }).isRequired,
  standardGoalFormButtons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.string,
      variant: PropTypes.string,
      label: PropTypes.string,
      to: PropTypes.string,
    })
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  goalTemplatePrompts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      prompt: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number,
          option: PropTypes.string,
        })
      ),
    })
  ),
  isRestart: PropTypes.bool,
}

GoalFormUpdateOrRestart.defaultProps = {
  goalTemplatePrompts: null,
  isRestart: false,
}
