import React, { useState } from 'react'
import PropTypes from 'prop-types'

import './Tooltip.scss'

export default function Tooltip({
  displayText,
  tooltipText,
  buttonLabel,
  screenReadDisplayText,
  hideUnderline,
  className,
  position,
  buttonClassName,
  maxWidth,
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const cssClasses = showTooltip ? `smart-hub-tooltip show-tooltip ${className}` : `smart-hub-tooltip ${className}`

  const onClick = () => {
    setShowTooltip(!showTooltip)
  }

  return (
    <span className={cssClasses} data-testid="tooltip">
      <button type="button" className={`usa-button usa-button--unstyled ${buttonClassName}`} onClick={onClick}>
        <span className="smart-hub--ellipsis" style={{ maxWidth: `${maxWidth}px` }}>
          <span className={hideUnderline ? '' : 'smart-hub-tooltip__underlined-text'} aria-hidden={!screenReadDisplayText}>
            {displayText}
          </span>
        </span>
        <span className="usa-sr-only">{buttonLabel}</span>
      </button>
      <div role="tooltip" aria-hidden={!showTooltip} className={`usa-tooltip__body usa-tooltip__body--${position}`}>
        {tooltipText}
      </div>
    </span>
  )
}

Tooltip.propTypes = {
  tooltipText: PropTypes.oneOfType([PropTypes.node, PropTypes.string, PropTypes.arrayOf(PropTypes.node)]).isRequired,
  displayText: PropTypes.oneOfType([PropTypes.node, PropTypes.string, PropTypes.arrayOf(PropTypes.node)]).isRequired,
  buttonLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  screenReadDisplayText: PropTypes.bool,
  hideUnderline: PropTypes.bool,
  className: PropTypes.string,
  position: PropTypes.string,
  buttonClassName: PropTypes.string,
  maxWidth: PropTypes.number,
}

Tooltip.defaultProps = {
  screenReadDisplayText: true,
  hideUnderline: false,
  className: '',
  position: 'top',
  buttonClassName: '',
  maxWidth: 175,
}
