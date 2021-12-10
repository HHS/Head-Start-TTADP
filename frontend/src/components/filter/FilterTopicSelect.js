import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import { TOPICS } from '../../Constants';

const TOPIC_OPTIONS = TOPICS.map((label, value) => ({ value, label }));

export default function FilterTopicSelect({
  onApply,
  labelId,
}) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      labelId={labelId}
      labelText="Filter by reasons"
      ariaName="Change filter by reasons menu"
      options={TOPIC_OPTIONS}
    />
  );
}

FilterTopicSelect.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
