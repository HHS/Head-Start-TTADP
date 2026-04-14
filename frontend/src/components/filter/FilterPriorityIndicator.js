import React from 'react';
import { PRIORITY_INDICATORS } from '@ttahub/common';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const INDICATORS_WITH_UNDERENROLLED = PRIORITY_INDICATORS.includes('Underenrolled')
  ? PRIORITY_INDICATORS
  : [...PRIORITY_INDICATORS, 'Underenrolled'];

// Keep DRS excluded from filter options because it is not currently surfaced in the spotlight UI.
const PRIORITY_INDICATOR_OPTIONS = INDICATORS_WITH_UNDERENROLLED
  .filter((label) => label !== 'DRS')
  .map((label, value) => ({ value, label }));

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
