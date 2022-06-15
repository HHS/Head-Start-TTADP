import React, { useState } from 'react';
import PropTypes from 'prop-types';

import './Tooltip.scss';

export default function Tooltip({
  displayText,
  tooltipText,
  buttonLabel,
  screenReadDisplayText,
  hideUnderline,
  svgLineTo,
  className,
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const cssClasses = showTooltip ? `smart-hub-tooltip show-tooltip ${className}` : `smart-hub-tooltip ${className}`;

  const onClick = () => {
    setShowTooltip(!showTooltip);
  };

  return (
    <span className={cssClasses} data-testid="tooltip">
      <div aria-hidden="true" className="usa-tooltip__body usa-tooltip__body--top maxw-card-lg">{tooltipText}</div>
      <button type="button" className="usa-button usa-button--unstyled" onClick={onClick}>
        <span className="smart-hub--ellipsis">
          <span aria-hidden={!screenReadDisplayText}>
            {displayText}
            {
              hideUnderline ? null
                : (
                  <svg height="5" xmlns="http://www.w3.org/2000/svg" version="1.1" aria-hidden="true" className="ttahub-tooltip-underline">
                    <path
                      d={`M 0 5 L ${svgLineTo} 5`}
                      stroke="black"
                      strokeLinecap="round"
                      strokeWidth="1"
                      strokeDasharray="5,5"
                      fill="none"
                    />
                  </svg>
                )
            }
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
  hideUnderline: PropTypes.bool,
  svgLineTo: PropTypes.number,
  className: PropTypes.string,
};

Tooltip.defaultProps = {
  screenReadDisplayText: true,
  hideUnderline: false,
  svgLineTo: 190,
  className: '',
};
