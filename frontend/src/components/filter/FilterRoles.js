import React from 'react'
import PropTypes from 'prop-types'
import FilterSelect from './FilterSelect'

// when/if we use this status filter for a different model, we can pass these in as a prop instead
// of defining these here

const options = ['ECS', 'FES', 'GS', 'HS', 'SS', 'AA', 'ECM', 'GSM', 'PS', 'RPM', 'SPS', 'TTAC', 'GS', 'OFS', 'COR', 'CO', 'NC', 'CSC'].map(
  (value) => ({ label: value, value })
)

export default function FilterRoles({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected)
  }

  return <FilterSelect onApply={onApplyClick} inputId={inputId} labelText="Select role to filter by" options={options} selectedValues={query} />
}

FilterRoles.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  query: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]).isRequired,
}
