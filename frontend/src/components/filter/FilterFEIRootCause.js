import React from 'react'
import PropTypes from 'prop-types'
import FilterSelect from './FilterSelect'

const options = ['Community partnerships', 'Facilities', 'Family circumstances', 'Other ECE care options', 'Unavailable', 'Workforce'].map(
  (value) => ({ label: value, value })
)

export default function FilterFEIRootCause({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected)
  }

  return (
    <FilterSelect onApply={onApplyClick} inputId={inputId} labelText="Select FEI root cause to filter by" options={options} selectedValues={query} />
  )
}

FilterFEIRootCause.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  query: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]).isRequired,
}
