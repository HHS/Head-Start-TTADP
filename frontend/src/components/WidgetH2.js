import React from 'react'
import PropTypes from 'prop-types'

export default function WidgetH2({ children, classNames }) {
  return <h2 className={`ttahub--dashboard-widget-heading margin-0 font-sans-lg ${classNames}`}>{children}</h2>
}

WidgetH2.propTypes = {
  children: PropTypes.node.isRequired,
  classNames: PropTypes.string,
}

WidgetH2.defaultProps = {
  classNames: '',
}
