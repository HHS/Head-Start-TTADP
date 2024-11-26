/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleUp,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';

export default function ExpanderButton({
  closeOrOpen,
  count,
  expanded,
  type,
  ariaLabel,
}) {
  if (count < 1) {
    return null;
  }

  return (
    <button
      type="button"
      className={`usa-button--outline usa-button text-no-underline text-middle tta-smarthub--expander-row-${type}s tta-smarthub--expander-row-${type}s-enabled`}
      onClick={() => closeOrOpen()}
      aria-label={`${expanded ? 'Hide' : 'View'} ${ariaLabel}`}
      data-testid="expander-button"
    >
      {expanded ? 'Hide' : 'View'}
      {' '}
      {type}
      {count > 1 ? 's' : ''}
      <strong className="margin-left-1">
        (
        {count}
        )
      </strong>
      <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={expanded ? faAngleUp : faAngleDown} />
    </button>
  );
}

ExpanderButton.propTypes = {
  type: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  closeOrOpen: PropTypes.func.isRequired,
  count: PropTypes.number.isRequired,
  expanded: PropTypes.bool.isRequired,
};
