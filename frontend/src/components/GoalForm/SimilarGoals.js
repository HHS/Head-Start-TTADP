import React from 'react';
import { uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX } from '@fortawesome/free-solid-svg-icons';
import SimilarGoal, { SimilarGoalProp } from './SimilarGoal';
import './SimilarGoals.scss';

export default function SimilarGoals({
  similar,
  setDismissSimilar,
  onSelectNudgedGoal,
}) {
  if (similar.length === 0) {
    return null;
  }

  return (
    <div className="ttahub-similar-goals position-absolute shadow-2 z-top">
      <fieldset className="bg-white border-0 margin-0 padding-0">
        <legend className="ttahub-similar-goals--legend usa-prose padding-2">
          <span className="text-bold" aria-live="polite" aria-label={`we found ${similar.length} goals with similar text`}>
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
          <SimilarGoal
            key={uniqueId('similar-goal-')}
            goal={goal}
            setDismissSimilar={setDismissSimilar}
            onSelectNudgedGoal={onSelectNudgedGoal}
          />
        ))}
      </fieldset>
    </div>
  );
}

SimilarGoals.propTypes = {
  similar: PropTypes.arrayOf(SimilarGoalProp).isRequired,
  setDismissSimilar: PropTypes.func.isRequired,
  onSelectNudgedGoal: PropTypes.func.isRequired,
};
