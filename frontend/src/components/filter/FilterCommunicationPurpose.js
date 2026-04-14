import { COMMUNICATION_PURPOSES } from '@ttahub/common';
import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const COMMUNICATION_PURPOSE_OPTIONS = COMMUNICATION_PURPOSES.map((label) => ({
  value: label,
  label,
}));

export default function FilterCommunicationPurpose({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select purpose to filter by"
      options={COMMUNICATION_PURPOSE_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterCommunicationPurpose.propTypes = filterSelectProps;
