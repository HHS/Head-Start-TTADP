/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleUp,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../../../colors';

export default function ObjectiveButton({
  closeOrOpenObjectives,
  objectiveCount,
  objectivesExpanded,
  goalNumber,
}) {
  if (objectiveCount < 1) {
    return null;
  }

  return (
    <button
      type="button"
      className="usa-button--outline usa-button text-no-underline text-middle tta-smarthub--goal-row-objectives tta-smarthub--goal-row-objectives-enabled"
      onClick={() => closeOrOpenObjectives()}
      aria-label={`${objectivesExpanded ? 'Collapse' : 'Expand'} objectives for goal ${goalNumber}`}
    >
      View objective
      {objectiveCount > 1 ? 's' : ''}
      <strong className="margin-left-1">
        (
        {objectiveCount}
        )
      </strong>
      <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={objectivesExpanded ? faAngleUp : faAngleDown} />
    </button>
  );
}

ObjectiveButton.propTypes = {
  closeOrOpenObjectives: PropTypes.func.isRequired,
  objectiveCount: PropTypes.number.isRequired,
  objectivesExpanded: PropTypes.bool.isRequired,
  goalNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
