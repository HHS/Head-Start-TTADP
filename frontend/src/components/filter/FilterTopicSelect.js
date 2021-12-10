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
      labelText="Filter by reasons"
      ariaName="Change filter by reasons menu"
      options={TOPIC_OPTIONS}
    />
  );
}

FilterTopicSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
