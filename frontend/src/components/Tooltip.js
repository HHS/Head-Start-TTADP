import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

import './Tooltip.scss';

export default function Tooltip({
  displayText,
  tooltipText,
  buttonLabel,
  screenReadDisplayText,
  hideUnderline,
  underlineStyle,
  className,
  position,
  buttonClassName,
  maxWidth,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.offsetWidth);
    }
  }, [displayText]);

  const cssClasses = showTooltip ? `smart-hub-tooltip show-tooltip ${className}` : `smart-hub-tooltip ${className}`;

  const onClick = () => {
    setShowTooltip(!showTooltip);
  };

  // Determine the stroke-dasharray based on underlineStyle
  const strokeDasharray = underlineStyle === 'solid' ? 'none' : '5,5';

  return (
    <span className={cssClasses} data-testid="tooltip">
      <button type="button" className={`usa-button usa-button--unstyled ${buttonClassName}`} onClick={onClick}>
        <span className="smart-hub--ellipsis" style={{ maxWidth: `${maxWidth}px` }}>
          <span ref={textRef} aria-hidden={!screenReadDisplayText}>
            {displayText}
            {
              hideUnderline ? null
                : (
                  <svg height="5" xmlns="http://www.w3.org/2000/svg" version="1.1" aria-hidden="true" className="ttahub-tooltip-underline">
                    <path
                      d={`M 0 5 L ${textWidth} 5`}
                      stroke="#71767A"
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
        <span className="usa-sr-only">
          {buttonLabel}
        </span>
      </button>
      <div role="tooltip" aria-hidden={!showTooltip} className={`usa-tooltip__body usa-tooltip__body--${position}`}>{tooltipText}</div>
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
  className: PropTypes.string,
  position: PropTypes.string,
  underlineStyle: PropTypes.oneOf(['solid', 'dashed']),
  buttonClassName: PropTypes.string,
  maxWidth: PropTypes.number,
};

Tooltip.defaultProps = {
  screenReadDisplayText: true,
  hideUnderline: false,
  className: '',
  position: 'top',
  underlineStyle: 'dashed',
  buttonClassName: '',
  maxWidth: 175,
};
