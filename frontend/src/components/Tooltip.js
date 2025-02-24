import React, { useState } from 'react';
import PropTypes from 'prop-types';

import './Tooltip.scss';

export default function Tooltip({
  displayText,
  tooltipText,
  buttonLabel,
  screenReadDisplayText,
  hideUnderline,
  underlineStyle,
  svgLineTo,
  className,
  position,
  buttonClassName,
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const cssClasses = showTooltip ? `smart-hub-tooltip show-tooltip ${className}` : `smart-hub-tooltip ${className}`;

  const onClick = () => {
    setShowTooltip(!showTooltip);
  };

  // Determine the stroke-dasharray based on underlineStyle
  const strokeDasharray = underlineStyle === 'solid' ? 'none' : '5,5';

  return (
    <span className={cssClasses} data-testid="tooltip">
      <div role="tooltip" aria-hidden="true" className={`usa-tooltip__body usa-tooltip__body--${position}`}>{tooltipText}</div>
      <button type="button" className={`usa-button usa-button--unstyled ${buttonClassName}`} onClick={onClick}>
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
                      strokeDasharray={strokeDasharray}
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
  buttonLabel: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node,
  ]).isRequired,
  screenReadDisplayText: PropTypes.bool,
  hideUnderline: PropTypes.bool,
  svgLineTo: PropTypes.number,
  className: PropTypes.string,
  position: PropTypes.string,
  underlineStyle: PropTypes.oneOf(['solid', 'dashed']),
  buttonClassName: PropTypes.string,
};

Tooltip.defaultProps = {
  screenReadDisplayText: true,
  hideUnderline: false,
  svgLineTo: 190,
  className: '',
  position: 'top',
  underlineStyle: 'dashed',
  buttonClassName: '',
};
