import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const PRIORITY_INDICATOR_OPTIONS = [
  'Child incidents',
  'Deficiency',
  'DRS',
  'FEI',
  'New recipient',
  'New staff',
  'No TTA',
].map((label, value) => ({ value, label }));

export default function FilterPriorityIndicator({
  onApply,
  inputId,
  query,
}) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select priority indicator to filter by"
      options={PRIORITY_INDICATOR_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterPriorityIndicator.propTypes = filterSelectProps;
