import React, {
  useContext, useEffect, useMemo, useState,
} from 'react';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import { useHistory, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { GOAL_FORM_FIELDS, mapObjectivesAndRootCauses } from './constants';
import { GOAL_FORM_BUTTON_LABELS, GOAL_FORM_BUTTON_TYPES, GOAL_FORM_BUTTON_VARIANTS } from '../../components/SharedGoalComponents/constants';
import { addStandardGoal, getStandardGoal } from '../../fetchers/standardGoals';
import useGoalTemplatePrompts from '../../hooks/useGoalTemplatePrompts';
import GoalFormUpdateOrRestart from '../../components/SharedGoalComponents/GoalFormUpdateOrRestart';
import AppLoadingContext from '../../AppLoadingContext';
import { HTTPError } from '../../fetchers';
import { ROUTES } from '../../Constants';

export default function RestartStandardGoal({ recipient }) {
  const { goalTemplateId, regionId, grantId } = useParams();
  const history = useHistory();

  const { setIsAppLoading } = useContext(AppLoadingContext);

  const [goal, setGoal] = useState(null);

  const hookForm = useForm({
    defaultValues: {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [],
      [GOAL_FORM_FIELDS.ROOT_CAUSES]: null,
    },
  });

  const [goalTemplatePrompts] = useGoalTemplatePrompts(goalTemplateId);

  useEffect(() => {
    const fetchStandardGoal = async () => {
      try {
        setIsAppLoading(true);

        // we need to get closed only if we are restarting the goal
        const g = await getStandardGoal(goalTemplateId, grantId, GOAL_STATUS.CLOSED);
        if (!g) {
          throw new HTTPError('Goal not found', 404);
        }
        setGoal(g);

        // We want the user to start fresh with objectives and root causes.
        const resetFormData = {
          // eslint-disable-next-line max-len
          [GOAL_FORM_FIELDS.OBJECTIVES]: [],
        };

        hookForm.reset(resetFormData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        history.push(`${ROUTES.SOMETHING_WENT_WRONG}/${err.status}`);
      } finally {
        setIsAppLoading(false);
      }
    };

    if (goal) {
      return;
    }

    if (goalTemplateId && grantId && goalTemplatePrompts) {
      fetchStandardGoal();
    }
  }, [goal, goalTemplateId, goalTemplatePrompts, grantId, history, hookForm, setIsAppLoading]);

  const standardGoalFormButtons = useMemo(() => [
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
      to: `/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`,
    },
  ], [recipient.id, regionId]);

  const onSubmit = async (data) => {
    try {
      setIsAppLoading(true);

      // submit to backend
      await addStandardGoal({
        goalTemplateId,
        grantId,
        status: GOAL_STATUS.IN_PROGRESS,
        ...mapObjectivesAndRootCauses(data),
      });

      history.push(`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    } finally {
      setIsAppLoading(false);
    }
  };

  if (!goal) {
    return null;
  }

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

RestartStandardGoal.propTypes = {
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        numberWithProgramTypes: PropTypes.string,
      }),
    ),
  }).isRequired,

};
