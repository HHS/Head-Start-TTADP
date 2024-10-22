import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { uniqueId } from 'lodash';
import { GOAL_STATUS } from '@ttahub/common';
import { dismissOnNoMatch } from './constants';
import './SimilarGoal.scss';

export const SimilarGoalProp = PropTypes.shape({
  name: PropTypes.string,
  status: PropTypes.string,
  ids: PropTypes.arrayOf(PropTypes.number),
  isCuratedTemplate: PropTypes.bool,
  source: PropTypes.string,
});

const SimilarGoal = ({
  goal,
  setDismissSimilar,
}) => {
  const { register, setValue } = useFormContext();

  const onClick = () => {
    if (goal.isCuratedTemplate) {
      const [templateId] = goal.ids;
      setValue('goalTemplate', {
        id: templateId,
        name: goal.name,
        source: goal.source,
      });
      setValue('useOhsInitiativeGoal', true);
      setValue('goalName', '');
      setValue('goalIds', []);
      setValue('goalStatus', GOAL_STATUS.NOT_STARTED);
    } else {
      setValue('goalTemplate', null);
      setValue('useOhsInitiativeGoal', false);
      setValue('goalName', goal.name);
      setValue('goalIds', goal.ids);
      setValue('goalStatus', goal.status);
    }
    setDismissSimilar(true);
  };

  const onKeyDown = async (e) => {
    if (e.key === 'Escape') {
      setDismissSimilar(true);
    }

    if (e.key === 'Enter') {
      onClick();
    }
  };

  const id = uniqueId('similar-goal-');

  return (
    <div className="ttahub-similar-goal">
      <label
        htmlFor={id}
        className="ttahub-similar-goal--label usa-label margin-top-0 padding-2 position-relative z-100"
      >
        <input
          ref={register()}
          type="radio"
          className="ttahub-similar-goal--input position-absolute z-200"
          id={id}
          value={goal.ids}
          name="similarGoals"
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            dismissOnNoMatch(e, '.ttahub-goal-nudge--container *', setDismissSimilar);
          }}
          onClick={onClick}
        />
        <span>{goal.name}</span>
        {' '}
        (
        <span className="text-bold">{goal.status}</span>
        )
      </label>
    </div>
  );
};

SimilarGoal.propTypes = {
  goal: SimilarGoalProp.isRequired,
  setDismissSimilar: PropTypes.func.isRequired,
};

export default SimilarGoal;
