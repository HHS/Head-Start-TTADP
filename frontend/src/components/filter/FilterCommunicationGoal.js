import { COMMUNICATION_GOALS } from '@ttahub/common';
import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const COMMUNICATION_GOAL_OPTIONS = COMMUNICATION_GOALS.map((label) => ({ value: label, label }));

export default function FilterCommunicationGoal({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select goal type to filter by"
      options={COMMUNICATION_GOAL_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterCommunicationGoal.propTypes = filterSelectProps;
