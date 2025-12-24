import React from 'react';
import { PRIORITY_INDICATORS } from '@ttahub/common';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const PRIORITY_INDICATOR_OPTIONS = PRIORITY_INDICATORS.map((label, value) => ({ value, label }));

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
