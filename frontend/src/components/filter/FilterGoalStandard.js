import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';
import useGoalTemplates from '../../hooks/useGoalTemplates';

export default function FilterGoalStandard({
  onApply,
  inputId,
  query,
}) {
  const goalTemplates = useGoalTemplates([]);

  const standards = (goalTemplates || []).map((template) => ({
    label: template.standard,
    value: template.id,
  }));

  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select goal standard to filter by"
      options={standards}
      selectedValues={query}
    />
  );
}

FilterGoalStandard.propTypes = filterSelectProps;
