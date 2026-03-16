import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import { MY_REPORT_ROLES, MY_CL_REPORT_ROLES } from '../../Constants';

const MY_REPORTS_OPTIONS = MY_REPORT_ROLES.map((label, value) => ({ value, label }));
const MY_CL_REPORTS_OPTIONS = MY_CL_REPORT_ROLES.map((label, value) => ({ value, label }));

export default function MyReportsSelect({
  onApply,
  inputId,
  query,
  isCommLog,
}) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };

  const options = isCommLog ? MY_CL_REPORTS_OPTIONS : MY_REPORTS_OPTIONS;

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select report roles to filter by"
      options={options}
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
  isCommLog: PropTypes.bool,
};

MyReportsSelect.defaultProps = {
  isCommLog: false,
};
