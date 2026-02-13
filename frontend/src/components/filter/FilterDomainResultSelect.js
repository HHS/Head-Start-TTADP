import React from 'react'
import FilterSelect from './FilterSelect'
import { filterSelectProps } from './props'

const OPTIONS = ['Above all thresholds', 'Below quality', 'Below competitive'].map((label, value) => ({ value, label }))

export default function FilterDomainResultSelect({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected)
  }
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select domain threshold to filter by"
      options={OPTIONS}
      selectedValues={query}
    />
  )
}

FilterDomainResultSelect.propTypes = filterSelectProps
