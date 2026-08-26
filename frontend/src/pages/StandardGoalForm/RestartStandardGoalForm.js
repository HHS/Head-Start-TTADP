import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import React, { useContext, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useHistory } from 'react-router';
import AppLoadingContext from '../../AppLoadingContext';
import {
  GOAL_FORM_BUTTON_LABELS,
  GOAL_FORM_BUTTON_TYPES,
  GOAL_FORM_BUTTON_VARIANTS,
} from '../../components/SharedGoalComponents/constants';
import GoalFormUpdateOrRestart from '../../components/SharedGoalComponents/GoalFormUpdateOrRestart';
import { addStandardGoal } from '../../fetchers/standardGoals';
import { GOAL_FORM_FIELDS, mapObjectivesAndRootCauses } from './constants';

export default function RestartStandardGoalForm({
  goal,
  goalTemplatePrompts,
  recipient,
  regionId,
  goalTemplateId,
  grantId,
  backLinkTo,
}) {
  const history = useHistory();
  const { setIsAppLoading } = useContext(AppLoadingContext);

  const hookForm = useForm({
    defaultValues: {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [],
      [GOAL_FORM_FIELDS.ROOT_CAUSES]: null,
    },
  });

  const standardGoalFormButtons = useMemo(
    () => [
      {
        id: uniqueId('goal-form-button-'),
        type: GOAL_FORM_BUTTON_TYPES.SUBMIT,
        variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
        label: GOAL_FORM_BUTTON_LABELS.RESTART,
      },
      {
        id: uniqueId('goal-form-button-'),
        type: GOAL_FORM_BUTTON_TYPES.LINK,
        variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
        label: GOAL_FORM_BUTTON_LABELS.CANCEL,
        to: backLinkTo,
      },
    ],
    [backLinkTo]
  );

  const onSubmit = async (data) => {
    try {
      setIsAppLoading(true);

      await addStandardGoal({
        goalTemplateId,
        grantId,
        status: GOAL_STATUS.IN_PROGRESS,
        ...mapObjectivesAndRootCauses(data),
      });

      history.push(backLinkTo);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    <GoalFormUpdateOrRestart
      hookForm={hookForm}
      onSubmit={onSubmit}
      recipient={recipient}
      regionId={regionId}
      goal={goal}
      goalTemplatePrompts={goalTemplatePrompts}
      standardGoalFormButtons={standardGoalFormButtons}
      isRestart
    />
  );
}

RestartStandardGoalForm.propTypes = {
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
  goalTemplatePrompts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      prompt: PropTypes.string,
    })
  ),
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  }).isRequired,
  regionId: PropTypes.string.isRequired,
  goalTemplateId: PropTypes.string.isRequired,
  grantId: PropTypes.string.isRequired,
  backLinkTo: PropTypes.string.isRequired,
};

RestartStandardGoalForm.defaultProps = {
  goalTemplatePrompts: null,
};
