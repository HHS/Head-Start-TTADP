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
  const onChange = (dateRange) => {
    onApplyDateRange(dateRange);
  };

  if (condition === 'Is within') {
    return (
      <DateRangeSelect
        options={DATE_OPTIONS}
        updateDateRange={onApplyDateRange}
        styleAsSelect
        onChange={onChange}
        dateRange={query}
      />
    );
  }

  let singleDateQuery = '';

  if (!Array.isArray(query) && typeof query === 'string' && query.split('-').length === 1) {
    singleDateQuery = query;
  }

  const onChangeSingleDate = (name, value) => {
    console.log(value);
    if (value) {
      onApplyDateRange(value);
    } else {
      onApplyDateRange('');
    }
  };

  return (
    <span className="border display-flex margin-top-1 ttahub-filter-date-range-single-date">
      <DatePicker query={singleDateQuery} onUpdateFilter={onChangeSingleDate} id="filter-date-picker" />
    </span>
  );
}

FilterDateRange.propTypes = {
  condition: PropTypes.string.isRequired,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired,
  onApplyDateRange: PropTypes.func.isRequired,
};
