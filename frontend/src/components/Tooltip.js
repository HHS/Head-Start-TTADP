import React, { useState } from 'react';
import PropTypes from 'prop-types';

import './Tooltip.css';

export default function Tooltip({
  displayText, tooltipText, buttonLabel,
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const cssClasses = showTooltip ? 'smart-hub--tooltip show-tooltip' : 'smart-hub--tooltip';

  const onClick = () => {
    setShowTooltip(!showTooltip);
    setTimeout(() => {
      setShowTooltip(false);
    }, 2500);
  };

  return (
    <span className={cssClasses} data-testid="tooltip">
      <div aria-hidden="true" className="usa-tooltip__body usa-tooltip__body--top">{tooltipText}</div>
      <button type="button" className="usa-button usa-button--unstyled" onClick={onClick}>
        <span className="smart-hub--ellipsis">
          {displayText}
        </span>
        <span className="sr-only">
          {buttonLabel}
        </span>
      </button>
    </span>
  );
}

Tooltip.propTypes = {
  tooltipText: PropTypes.string.isRequired,
  displayText: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.node),
  ]).isRequired,
  buttonLabel: PropTypes.string.isRequired,
};
