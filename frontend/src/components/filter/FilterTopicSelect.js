import React from 'react';
import FilterSelect from './FilterSelect';
import { TOPICS } from '../../Constants';
import { filterSelectProps } from './props';

const TOPIC_OPTIONS = TOPICS.map((label, value) => ({ value, label }));

export default function FilterTopicSelect({
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
      labelText="Select topics to filter by"
      options={TOPIC_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterTopicSelect.propTypes = filterSelectProps;
