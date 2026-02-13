import React from 'react'
import PropTypes from 'prop-types'
import './LegendControl.scss'

/**
 * the legend control for the graph (input, span, line)
 * @param {props} object
 * @returns A jsx element
 */
export default function LegendControl({ label, id, selected, setSelected, shape }) {
  function handleChange() {
    setSelected(!selected)
  }

  return (
    <div className={`usa-checkbox grid-col flex-auto ${shape} ttahub-legend-control`}>
      <input className="usa-checkbox__input" id={id} type="checkbox" name={id} checked={selected} onChange={handleChange} data-html2canvas-ignore />
      <label className="usa-checkbox__label padding-right-3" htmlFor={id}>
        {' '}
        {label}
      </label>
    </div>
  )
}

LegendControl.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  setSelected: PropTypes.func.isRequired,
  shape: PropTypes.string.isRequired,
}
