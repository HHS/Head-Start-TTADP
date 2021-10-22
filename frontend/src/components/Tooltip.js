import React, { useState } from 'react';
import PropTypes from 'prop-types';

import './Tooltip.css';

export default function Tooltip({
  displayText, tooltipText, buttonLabel, screenReadDisplayText,
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const cssClasses = showTooltip ? 'smart-hub--tooltip show-tooltip' : 'smart-hub--tooltip';

  const onClick = () => {
    setShowTooltip(!showTooltip);
  };

  return (
    <span className={cssClasses} data-testid="tooltip">
      <div aria-hidden="true" className="usa-tooltip__body usa-tooltip__body--top">{tooltipText}</div>
      <button type="button" className="usa-button usa-button--unstyled" onClick={onClick}>
        <span className="smart-hub--ellipsis">
          <span aria-hidden={!screenReadDisplayText}>
            {displayText}
            <svg height="5" xmlns="http://www.w3.org/2000/svg" version="1.1" aria-hidden="true">
              <path
                d="M 0 5 L 190 5"
                stroke="black"
                strokeLinecap="round"
                strokeWidth="1"
                strokeDasharray="5,5"
                fill="none"
              />
            </svg>
          </span>
        </span>
        <span className="sr-only">
          {buttonLabel}
        </span>
      </button>
    </span>
  );
}

Tooltip.propTypes = {
  tooltipText: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.node),
  ]).isRequired,
  displayText: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.node),
  ]).isRequired,
  buttonLabel: PropTypes.string.isRequired,
  screenReadDisplayText: PropTypes.bool,
};

Tooltip.defaultProps = {
  screenReadDisplayText: true,
};
