import React from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker,
  Dropdown,
} from '@trussworks/react-uswds';
import moment from 'moment';
import DateRangePicker from './DateRangePicker';
import { formatDateRange } from '../DateRangeSelect';
import './FilterDateRange.css';

/**
 * this date picker has bespoke date options
 */
const DATE_OPTIONS = [
  {
    label: 'Year to date',
    value: formatDateRange({ yearToDate: true, forDateTime: true }),
  },
  {
    label: 'Last thirty days',
    value: formatDateRange({ lastThirtyDays: true, forDateTime: true }),
  },
];

export default function FilterDateRange({
  condition,
  onApplyDateRange,
}) {
  const isOnChange = (e) => onApplyDateRange(e.target.value);
  const onChange = (date) => {
    onApplyDateRange(moment(date, 'MM/DD/YYYY').format('YYYY/MM/DD'));
  };

  switch (condition) {
    case 'Is':
      return (
        <Dropdown
          id="filter-date-range"
          name="filter-date-range"
          onChange={isOnChange}
        >
          {DATE_OPTIONS.map(
            (dateOption) => <option value={dateOption.value}>{dateOption.label}</option>,
          )}
        </Dropdown>
      );

    case 'Is within':
      return (
        <DateRangePicker onApply={onApplyDateRange} />
      );
    case 'Is before':
      return (
        <DatePicker
          id="filter-date-range"
          name="filter-date-range"
          onChange={onChange}
        />
      );
    case 'Is after':
      return (
        <DatePicker
          id="filter-date-range"
          name="filter-date-range"
          onChange={onChange}
        />
      );
    default:
      return <input />;
  }
}

FilterDateRange.propTypes = {
  condition: PropTypes.string.isRequired,
  onApplyDateRange: PropTypes.func.isRequired,
};
