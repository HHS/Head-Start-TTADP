import { GOAL_STATUS } from '@ttahub/common/src/constants';
import PropTypes from 'prop-types';
import React from 'react';
import FilterSelect from './FilterSelect';

const ALL_STATUS_OPTIONS = Object.values(GOAL_STATUS).map((status) => ({
  label: status,
  value: status,
}));

export default function FilterStatus({ onApply, inputId, query, options }) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select status to filter by"
      options={options}
      selectedValues={query}
    />
  );
}

FilterStatus.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  query: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]).isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
};

FilterStatus.defaultProps = {
  options: ALL_STATUS_OPTIONS,
};
