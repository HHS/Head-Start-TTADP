import React from 'react';
import PropTypes from 'prop-types';
import DateRangeSelect, { formatDateRange } from '../DateRangeSelect';
import DatePicker from '../FilterDatePicker';

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
  updateSingleDate,
  onApplyDateRange,
}) {
  if (condition === 'Is within') {
    return (
      <span className="margin-right-1">
        <DateRangeSelect
          options={DATE_OPTIONS}
          updateDateRange={onApplyDateRange}
          styleAsSelect
        />
      </span>
    );
  }
  return (
    <span className="ttahub-filter-menu-single-date-picker display-flex margin-top-1 margin-x-1">
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
