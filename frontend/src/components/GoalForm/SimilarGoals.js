/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX } from '@fortawesome/free-solid-svg-icons';
import { uniqueId } from 'lodash';
import './SimilarGoals.scss';

const SimilarGoalProp = PropTypes.shape({
  name: PropTypes.string,
  status: PropTypes.string,
  ids: PropTypes.arrayOf(PropTypes.number),
});

const SimilarGoal = ({ goal }) => {
  const id = uniqueId('similar-goal-');

  return (
    <div className="ttahub-similar-goal">
      <input type="radio" id={id} value={goal.ids} className="usa-sr-only" name={id} />
      <label htmlFor={id} className="ttahub-similar-goal--label usa-label margin-top-0 padding-2" tabIndex={0}>
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
};

export default function SimilarGoals({ similar, setDismissSimilar }) {
  if (similar.length === 0) {
    return null;
  }

  return (
    <div className="ttahub-similar-goals position-absolute shadow-2">
      <fieldset className="bg-white border-0 margin-0 padding-0">
        <legend className="ttahub-similar-goals--legend usa-prose padding-2">
          <span className="text-bold">
            Similar goals (
            {similar.length}
            )
          </span>
          <button
            className="ttahub-similar-goals--close-button bg-white border-0"
            onClick={() => {
              setDismissSimilar(true);
            }}
            aria-label="Dismiss similar goals"
            type="button"
          >
            <FontAwesomeIcon icon={faX} />
          </button>
        </legend>

        {similar.map((goal) => (
          <SimilarGoal goal={goal} />
        ))}

      </fieldset>
    </div>
  );
}

SimilarGoals.propTypes = {
  similar: PropTypes.arrayOf(SimilarGoalProp).isRequired,
  setDismissSimilar: PropTypes.func.isRequired,
};
