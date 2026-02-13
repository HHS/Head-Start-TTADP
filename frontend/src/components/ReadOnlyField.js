import React from 'react'
import PropTypes from 'prop-types'

export default function ReadOnlyField({ label, children }) {
  if (!children || !label) {
    return null
  }

  return (
    <>
      <div className="usa-prose margin-top-2 margin-bottom-0 text-bold" data-testid="read-only-label">
        {label}
      </div>
      <div className="usa-prose margin-top-0" data-testid="read-only-value">
        {children}
      </div>
    </>
  )
}

ReadOnlyField.propTypes = {
  label: PropTypes.string,
  children: PropTypes.node,
}

ReadOnlyField.defaultProps = {
  label: undefined,
  children: undefined,
}
