import React from 'react'
import { COMMUNICATION_METHODS } from '@ttahub/common'
import FilterSelect from './FilterSelect'
import { filterSelectProps } from './props'

const COMMUNICATION_METHOD_OPTIONS = COMMUNICATION_METHODS.map((label, value) => ({ value, label }))

export default function FilterCommunicationMethod({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected)
  }
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select method type to filter by"
      options={COMMUNICATION_METHOD_OPTIONS}
      selectedValues={query}
    />
  )
}

FilterCommunicationMethod.propTypes = filterSelectProps
