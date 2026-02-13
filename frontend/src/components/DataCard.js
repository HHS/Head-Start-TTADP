import React from 'react'
import PropTypes from 'prop-types'
import './DataCard.css'

export default function DataCard({ children, testId, className, errorBorder }) {
  const borderClass = errorBorder ? 'smart-hub-border-base-error' : 'smart-hub-border-base-lighter'
  return (
    <article
      data-testid={testId}
      className={`ttahub-data-card usa-card padding-3 radius-lg border ${borderClass} width-full maxw-full margin-bottom-2 ${className}`}
    >
      {children}
    </article>
  )
}

DataCard.propTypes = {
  children: PropTypes.node.isRequired,
  testId: PropTypes.string,
  className: PropTypes.string,
  errorBorder: PropTypes.bool,
}

DataCard.defaultProps = {
  testId: 'data-card-container',
  className: '',
  errorBorder: false,
}
