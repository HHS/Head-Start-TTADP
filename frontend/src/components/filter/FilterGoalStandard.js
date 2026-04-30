import React from 'react';
import useGoalTemplates from '../../hooks/useGoalTemplates';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterGoalStandard({ onApply, inputId, query }) {
  const goalTemplates = useGoalTemplates([]);

  const standards = (goalTemplates || [])
    .map((template) => ({
      label: template.standard,
      value: template.id,
    }))
    .filter(({ label }) => label !== 'Monitoring');

  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select goal standard to filter by"
      options={standards}
      selectedValues={query}
    />
  );
}

FilterGoalStandard.propTypes = filterSelectProps;
