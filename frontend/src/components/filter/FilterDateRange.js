import React from 'react';
import PropTypes from 'prop-types';
import DateRangeSelect from '../DateRangeSelect';
import DatePicker from '../FilterDatePicker';
import './FilterDateRange.css';

export default function FilterDateRange({
  condition,
  query,
  updateSingleDate,
  onApplyDateRange,
  options,
}) {
  if (condition === 'Is within') {
    return (
      <DateRangeSelect
        options={options}
        updateDateRange={onApplyDateRange}
        styleAsSelect
      />
    );
  }
  return (
    <span className="border display-flex margin-top-1 ttahub-filter-date-range-single-date">
      <DatePicker query={Array.isArray(query) ? '' : query} onUpdateFilter={updateSingleDate} id="filter-date-picker" />
    </span>
  );
}

FilterDateRange.propTypes = {
  condition: PropTypes.string.isRequired,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired,
  updateSingleDate: PropTypes.func.isRequired,
  onApplyDateRange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
    range: PropTypes.string,
  })).isRequired,
};
