import { COMMUNICATION_GOALS } from '@ttahub/common';
import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const COLLAB_GOAL_OPTIONS = COMMUNICATION_GOALS.map((label) => ({ value: label, label }));

export default function FilterCollabGoal({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select goal type to filter by"
      options={COLLAB_GOAL_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterCollabGoal.propTypes = filterSelectProps;
