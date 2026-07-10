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

const optionsFor = {
  myReports: MY_REPORTS_OPTIONS,
  commLog: MY_CL_REPORTS_OPTIONS,
  ttaHistory: TTA_HISTORY_REPORTS_OPTIONS,
};

export default function MyReportsSelect({ onApply, inputId, query, isFor }) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };

  const options = optionsFor[isFor] || optionsFor.myReports;

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
  isFor: PropTypes.oneOf(Object.keys(optionsFor)),
};

MyReportsSelect.defaultProps = {
  isFor: 'myReports',
};
