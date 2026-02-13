import React from 'react'
import { COMMUNICATION_RESULTS } from '@ttahub/common'
import FilterSelect from './FilterSelect'
import { filterSelectProps } from './props'

const COMMUNICATION_RESULT_OPTIONS = COMMUNICATION_RESULTS.map((label, value) => ({ value, label }))

export default function FilterCommunicationResult({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected)
  }
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select result to filter by"
      options={COMMUNICATION_RESULT_OPTIONS}
      selectedValues={query}
    />
  )
}

FilterCommunicationResult.propTypes = filterSelectProps
