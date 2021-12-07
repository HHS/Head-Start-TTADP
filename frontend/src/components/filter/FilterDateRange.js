import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import DateRangeSelect, { formatDateRange } from '../DateRangeSelect';
import DatePicker from '../FilterDatePicker';
import './FilterDateRange.css';

/**
 * this date picker has bespoke date options
 */
const DATE_OPTIONS = [
  {
    label: 'Year to Date',
    value: 1,
    range: formatDateRange({ yearToDate: true, forDateTime: true }),
  },
  {
    label: 'Custom Date Range',
    value: 2,
    range: '',
  },
];

export default function FilterDateRange({
  condition,
  query,
  onApplyDateRange,
}) {
  const onChange = useCallback((dateRange) => {
    onApplyDateRange(dateRange);
  }, [onApplyDateRange]);

  if (condition === 'Is within') {
    return (
      <DateRangeSelect
        options={DATE_OPTIONS}
        updateDateRange={onApplyDateRange}
        styleAsSelect
        onChange={onChange}
      />
    );
  }
  return (
    <span className="border display-flex margin-top-1 ttahub-filter-date-range-single-date">
      <DatePicker query={Array.isArray(query) ? '' : query} onUpdateFilter={onChange} id="filter-date-picker" />
    </span>
  );
}

FilterDateRange.propTypes = {
  condition: PropTypes.string.isRequired,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired,
  onApplyDateRange: PropTypes.func.isRequired,
};
