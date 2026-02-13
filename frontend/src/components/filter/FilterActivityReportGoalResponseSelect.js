import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { getGoalTemplatePromptOptionsByName } from '../../fetchers/goalTemplates'
import FilterSelect from './FilterSelect'
import { filterSelectProps } from './props'

export default function FilterActivityReportGoalResponseSelect({ onApply, inputId, query, title }) {
  const [goalTemplatePrompts, setGoalTemplatePrompts] = useState([])

  useEffect(() => {
    async function fetchGoalTemplatePrompts() {
      const gtPrompts = await getGoalTemplatePromptOptionsByName(title)
      setGoalTemplatePrompts(gtPrompts.options.map((label, value) => ({ value, label })))
    }

    fetchGoalTemplatePrompts()
  }, [setGoalTemplatePrompts, title])

  const onApplyClick = (selected) => {
    onApply(selected)
  }
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select root cause to filter by"
      options={goalTemplatePrompts}
      selectedValues={query}
    />
  )
}

FilterActivityReportGoalResponseSelect.propTypes = {
  ...filterSelectProps,
  title: PropTypes.string.isRequired,
}
