import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import { MY_REPORT_ROLES } from '../../Constants';

const MY_REPORTS_OPTIONS = MY_REPORT_ROLES.map((label, value) => ({ value, label }));

export default function MyReportsSelect({
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
      labelText="Select report roles to filter by"
      options={MY_REPORTS_OPTIONS}
      selectedValues={query}
    />
  );
}

MyReportsSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  query: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
  ]).isRequired,
};
