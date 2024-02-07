import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import './SimilarGoal.scss';

export const SimilarGoalProp = PropTypes.shape({
  name: PropTypes.string,
  status: PropTypes.string,
  ids: PropTypes.arrayOf(PropTypes.number),
});

const SimilarGoal = ({
  goal,
  setDismissSimilar,
  onSelectNudgedGoal,
}) => {
  const onClick = async () => {
    onSelectNudgedGoal(goal);
  };

  const onKeyDown = async (e) => {
    if (e.key === 'Escape') {
      setDismissSimilar(true);
    }

    if (e.key === 'Enter') {
      await onClick();
    }

    // TODO: handle arrow keys
    // TODO: research other key events for dropdown
  };

  const id = uniqueId('similar-goal-');

  return (
    <div className="ttahub-similar-goal">
      <label
        htmlFor={id}
        className="ttahub-similar-goal--label usa-label margin-top-0 padding-2 position-relative"
      >
        <input
          onClick={onClick}
          type="radio"
          className="ttahub-similar-goal--input position-absolute"
          id={id}
          value={goal.ids}
          name={id}
          onKeyDown={onKeyDown}
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
  onSelectNudgedGoal: PropTypes.func.isRequired,
};

export default SimilarGoal;
