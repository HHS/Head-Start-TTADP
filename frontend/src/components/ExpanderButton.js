/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleUp,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';

const ExpanderButton = forwardRef(({
  closeOrOpen,
  count,
  expanded,
  type,
  ariaLabel,
  pluralize,
  showCount,
  allowZeroCount,
}, ref) => {
  if (count < 1 && !allowZeroCount) {
    return null;
  }

  return (
    <button
      type="button"
      className={`usa-button--outline usa-button text-no-underline text-middle tta-smarthub--expander-row-${type}s tta-smarthub--expander-row-${type}s-enabled`}
      onClick={() => closeOrOpen()}
      aria-label={`${expanded ? 'Hide' : 'View'} ${ariaLabel}`}
      data-testid="expander-button"
      ref={ref}
    >
      {expanded ? 'Hide' : 'View'}
      {' '}
      {type}
      {count > 1 && pluralize ? 's' : ''}
      {showCount && (
      <strong className="margin-left-1">
        (
        {count}
        )
      </strong>
      )}
      <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={expanded ? faAngleUp : faAngleDown} />
    </button>
  );
});

ExpanderButton.propTypes = {
  type: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  closeOrOpen: PropTypes.func.isRequired,
  count: PropTypes.number.isRequired,
  expanded: PropTypes.bool.isRequired,
  pluralize: PropTypes.bool,
  showCount: PropTypes.bool,
  allowZeroCount: PropTypes.bool,
};

ExpanderButton.defaultProps = {
  pluralize: true,
  showCount: true,
  allowZeroCount: false,
};

export default ExpanderButton;
