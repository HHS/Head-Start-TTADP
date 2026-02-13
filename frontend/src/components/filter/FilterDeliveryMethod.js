import React from 'react'
import FilterSelect from './FilterSelect'
import { filterSelectProps } from './props'

const DELIVERY_METHOD_OPTIONS = ['In Person', 'Virtual', 'Hybrid'].map((label, value) => ({ value, label }))

export default function FilterDeliveryMethod({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected)
  }
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select delivery method to filter by"
      options={DELIVERY_METHOD_OPTIONS}
      selectedValues={query}
    />
  )
}

FilterDeliveryMethod.propTypes = filterSelectProps
