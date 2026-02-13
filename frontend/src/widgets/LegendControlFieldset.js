import React from 'react'
import PropTypes from 'prop-types'
import { Fieldset } from '@trussworks/react-uswds'

export default function LegendControlFieldset({ children, legend }) {
  return (
    <Fieldset className="ttahub-legend-control-fieldset grid-row text-align-center margin-bottom-3 border-0 padding-0">
      <legend className="usa-sr-only">{legend}</legend>
      {children}
    </Fieldset>
  )
}

LegendControlFieldset.propTypes = {
  children: PropTypes.node.isRequired,
  legend: PropTypes.string.isRequired,
}
