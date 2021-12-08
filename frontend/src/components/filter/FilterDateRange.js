import React from 'react';
import PropTypes from 'prop-types';
import DateRangeSelect, { formatDateRange } from '../DateRangeSelect';
import DatePicker from '../FilterDatePicker';
import './FilterDateRange.css';

/**
 * this date picker has bespoke date options
 */
const DATE_OPTIONS = [
  {
    label: 'Year to date',
    value: 1,
    range: formatDateRange({ yearToDate: true, forDateTime: true }),
  },
  {
    label: 'Custom date range',
    value: 2,
    range: '',
  },
];

export default function FilterDateRange({
  condition,
  query,
  updateSingleDate,
  onApplyDateRange,
}) {
  if (condition === 'Is within') {
    return (
      <DateRangeSelect
        options={DATE_OPTIONS}
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
};
