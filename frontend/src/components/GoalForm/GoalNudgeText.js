import React from 'react';
import PropTypes from 'prop-types';
import { Textarea } from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import { SimilarGoalProp } from './SimilarGoal';
import SimilarGoals from './SimilarGoals';
import { dismissOnNoMatch } from './constants';
import FormItem from '../FormItem';
import FormFieldThatIsSometimesReadOnly from './FormFieldThatIsSometimesReadOnly';

const INPUT_NAME = 'goalName';
const FIELD_LABEL = 'Recipient\'s goal';
export default function GoalNudgeText({
  similar,
  dismissSimilar,
  setDismissSimilar,
  useOhsInitiativeGoal,
}) {
  const { register, watch } = useFormContext();

  if (useOhsInitiativeGoal) {
    return null;
  }

  const { goalName, isGoalNameEditable } = watch();

  return (
    <FormFieldThatIsSometimesReadOnly
      label={FIELD_LABEL}
      permissions={[isGoalNameEditable]}
      value={goalName}
    >
      <FormItem label={FIELD_LABEL} name={INPUT_NAME} required>
        <Textarea
          onBlur={(e) => {
            e.stopPropagation();
            if (similar.length) {
              dismissOnNoMatch(e, '.ttahub-goal-nudge--container *, .ttahub-similar-goal--input', setDismissSimilar);
            }
          }}
          id={INPUT_NAME}
          name={INPUT_NAME}
          style={{ height: '80px' }}
          inputRef={register({ required: 'Enter goal text' })}
          defaultValue=""
          required
          className="ttahub-goal-nudge--textarea"
        />
        <SimilarGoals
          similar={similar}
          dismissSimilar={dismissSimilar}
          setDismissSimilar={setDismissSimilar}
        />
      </FormItem>
    </FormFieldThatIsSometimesReadOnly>
  );
}

GoalNudgeText.propTypes = {
  similar: PropTypes.arrayOf(SimilarGoalProp).isRequired,
  setDismissSimilar: PropTypes.func.isRequired,
  dismissSimilar: PropTypes.bool.isRequired,
  useOhsInitiativeGoal: PropTypes.bool.isRequired,
};
