import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import { TOPICS } from '../../Constants';

const TOPIC_OPTIONS = TOPICS.map((label, value) => ({ value, label }));

export default function FilterTopicSelect({
  onApply,
  inputId,
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
    />
  );
}

FilterTopicSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
