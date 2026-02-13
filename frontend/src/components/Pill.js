import React from 'react'
import PropTypes from 'prop-types'
import './Pill.scss'

export default function Pill({ children, className, type }) {
  const typeClasses = {
    success: 'bg-success-darker text-white',
  }

  const classNames = ['ttahub-pill', 'radius-pill', className, typeClasses[type] || ''].join(' ')

  return <span className={classNames}>{children}</span>
}

Pill.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  type: PropTypes.oneOf(['success']),
}

Pill.defaultProps = {
  className: '',
  type: null,
}
