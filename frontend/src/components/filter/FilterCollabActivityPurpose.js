import React from 'react';
import { COLLAB_REPORT_REASONS } from '../../Constants';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const ACTIVITY_PURPOSE_OPTIONS = Object.entries(COLLAB_REPORT_REASONS).map(([value, label]) => ({
  value,
  label,
}));

export default function FilterCollabActivityPurpose({ onApply, inputId, query }) {
  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select activity purpose to filter by"
      options={ACTIVITY_PURPOSE_OPTIONS}
      selectedValues={query}
      mapByValue
    />
  );
}

FilterCollabActivityPurpose.propTypes = filterSelectProps;
