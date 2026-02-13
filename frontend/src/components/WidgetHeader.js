import React from 'react'
import PropTypes from 'prop-types'

export default function WidgetHeader({ children }) {
  return <h2 className="margin-bottom-1 margin-top-2 font-sans-xl">{children}</h2>
}

WidgetHeader.propTypes = {
  children: PropTypes.node.isRequired,
}
