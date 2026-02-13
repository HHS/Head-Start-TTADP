import React, { useContext } from 'react'
import FilterSelect from './FilterSelect'
import { filterSelectProps } from './props'
import { StaffContext } from '../StaffProvider'

export default function FilterTrainingReportStaff({ onApply, inputId, query }) {
  const { staff } = useContext(StaffContext)

  const onApplyClick = (selected) => {
    onApply(selected)
  }

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select user to filter by"
      options={staff}
      selectedValues={query}
      labelProp="fullName"
      valueProp="id"
      mapByValue
    />
  )
}

FilterTrainingReportStaff.propTypes = {
  ...filterSelectProps,
}
