/* eslint-disable react/jsx-props-no-spreading */
import React, {
  useContext, useEffect, useMemo, useState,
} from 'react';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import { useParams } from 'react-router';
import { FormProvider, useForm, useFieldArray } from 'react-hook-form';
import GoalFormContainer from '../../components/SharedGoalComponents/GoalFormContainer';
import GoalFormNavigationLink from '../../components/SharedGoalComponents/GoalFormNavigationLink';
import GoalFormHeading from '../../components/SharedGoalComponents/GoalFormHeading';
import GoalFormTitleGroup from '../../components/SharedGoalComponents/GoalFormTitleGroup';
import ReadOnlyField from '../../components/ReadOnlyField';
import { GOAL_FORM_FIELDS } from './constants';
import { GOAL_FORM_BUTTON_LABELS, GOAL_FORM_BUTTON_TYPES, GOAL_FORM_BUTTON_VARIANTS } from '../../components/SharedGoalComponents/constants';
import GoalFormButtonIterator from '../../components/SharedGoalComponents/GoalFormButtonIterator';
import ObjectivesSection from '../../components/SharedGoalComponents/ObjectivesSection';
import GoalFormTemplatePrompts from '../../components/SharedGoalComponents/GoalFormTemplatePrompts';
import { getStandardGoal } from '../../fetchers/standardGoals';
import useGoalTemplatePrompts from '../../hooks/useGoalTemplatePrompts';
import AppLoadingContext from '../../AppLoadingContext';

export default function UpdateStandardGoal({ recipient }) {
  const { goalTemplateId, regionId, grantId } = useParams();

  const { setIsAppLoading } = useContext(AppLoadingContext);

  const [goal, setGoal] = useState(null);

  const hookForm = useForm({
    defaultValues: {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [],
      [GOAL_FORM_FIELDS.ROOT_CAUSES]: null,
    },
  });

  const {
    fields: objectives,
    append: appendObjective,
    remove: removeObjective,
  } = useFieldArray({
    control: hookForm.control,
    name: GOAL_FORM_FIELDS.OBJECTIVES,
  });

  const goalTemplatePrompts = useGoalTemplatePrompts(goalTemplateId);

  useEffect(() => {
    const fetchStandardGoal = async () => {
      try {
        setIsAppLoading(true);
        const g = await getStandardGoal(goalTemplateId, grantId);
        setGoal(g);
        hookForm.reset({
          [GOAL_FORM_FIELDS.ROOT_CAUSES]: g.responses.flatMap((responses) => (
            responses.response.map((r) => ({ id: r, name: r }))
          )),
          // eslint-disable-next-line max-len
          [GOAL_FORM_FIELDS.OBJECTIVES]: g.objectives.map((o) => ({ value: o.title, objectiveTemplateId: o.id, onAR: o.onAR })),
        });
        // g.objectives.forEach((o) => {
        //   appendObjective({ value: o.title, objectiveTemplateId: o.id, onAR: o.onAR });
        // });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
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
  }, [
    goal,
    goalTemplateId,
    goalTemplatePrompts,
    grantId,
    hookForm,
    // appendObjective,
    setIsAppLoading,
  ]);

  const standardGoalFormButtons = useMemo(() => [
    {
      id: uniqueId('goal-form-button-'),
      type: GOAL_FORM_BUTTON_TYPES.SUBMIT,
      variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
      label: GOAL_FORM_BUTTON_LABELS.SAVE,
    },
    {
      id: uniqueId('goal-form-button-'),
      type: GOAL_FORM_BUTTON_TYPES.LINK,
      variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      label: GOAL_FORM_BUTTON_LABELS.CANCEL,
      to: `/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`,
    },
  ], [recipient.id, regionId]);

  const onSubmit = async () => {};

  if (!goal) {
    return null;
  }

  return (
    <FormProvider {...hookForm}>
      <GoalFormNavigationLink recipient={recipient} regionId={regionId} />
      <GoalFormHeading recipient={recipient} regionId={regionId} />
      <GoalFormContainer>
        <GoalFormTitleGroup status={GOAL_STATUS.NOT_STARTED} goalNumbers={[`G-${goal.id}`]} />
        <ReadOnlyField label="Recipient grant numbers">
          {goal.grant.numberWithProgramTypes}
        </ReadOnlyField>

        <ReadOnlyField label="Recipient's goal">
          {goal.name}
        </ReadOnlyField>

        <form onSubmit={hookForm.handleSubmit(onSubmit)}>
          <GoalFormTemplatePrompts
            goalTemplatePrompts={goalTemplatePrompts}
          />
          <ObjectivesSection
            fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
            objectives={objectives}
            append={appendObjective}
            remove={removeObjective}
          />
          <GoalFormButtonIterator buttons={standardGoalFormButtons} />
        </form>
      </GoalFormContainer>
    </FormProvider>
  );
}

UpdateStandardGoal.propTypes = {
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
