import React from 'react'
import PropTypes from 'prop-types'

export default function WidgetContainerSubtitle({ children, marginY }) {
  return <p className={`smart-hub-widget--subtitle usa-prose margin-x-0 margin-y-${marginY}`}>{children}</p>
}

WidgetContainerSubtitle.propTypes = {
  children: PropTypes.node.isRequired,
  marginY: PropTypes.number,
}

WidgetContainerSubtitle.defaultProps = {
  marginY: 0,
}
