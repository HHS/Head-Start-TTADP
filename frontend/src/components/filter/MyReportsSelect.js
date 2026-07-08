import PropTypes from 'prop-types';
import React from 'react';
import { MY_CL_REPORT_ROLES, MY_REPORT_ROLES, TTA_HISTORY_REPORT_ROLES } from '../../Constants';
import FilterSelect from './FilterSelect';

const MY_REPORTS_OPTIONS = MY_REPORT_ROLES.map((label, value) => ({ value, label }));
const MY_CL_REPORTS_OPTIONS = MY_CL_REPORT_ROLES.map((label, value) => ({ value, label }));
const TTA_HISTORY_REPORTS_OPTIONS = TTA_HISTORY_REPORT_ROLES.map((label, value) => ({
  value,
  label,
}));

export default function MyReportsSelect({ onApply, inputId, query, isCommLog, isTtaHistory }) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };

  let options = MY_REPORTS_OPTIONS;
  if (isCommLog) {
    options = MY_CL_REPORTS_OPTIONS;
  } else if (isTtaHistory) {
    options = TTA_HISTORY_REPORTS_OPTIONS;
  }

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
  query: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]).isRequired,
  isCommLog: PropTypes.bool,
  isTtaHistory: PropTypes.bool,
};

MyReportsSelect.defaultProps = {
  isCommLog: false,
  isTtaHistory: false,
};
