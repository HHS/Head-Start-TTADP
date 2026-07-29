import { PRIORITY_INDICATORS } from '@ttahub/common';
import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

// Filter out DRS from the options, but keep it in the constant for future use
const PRIORITY_INDICATOR_OPTIONS = PRIORITY_INDICATORS.filter((label) => label !== 'DRS').map(
  (label, value) => ({ value, label })
);

export default function FilterPriorityIndicator({ onApply, inputId, query }) {
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
