/* eslint-disable jsx-a11y/label-has-associated-control */

import { DatePicker, Dropdown } from '@trussworks/react-uswds';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useContext, useRef } from 'react';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import DateRangePicker from './DateRangePicker';
import { DATE_OPTIONS } from './dateFilterOptions';
import FilterErrorContext from './FilterErrorContext';

const QUERY_DATE_FORMAT = 'YYYY/MM/DD';
const DATEPICKER_DATE_FORMAT = 'YYYY-MM-DD';
const MIN_DATE = '2020-09-01';
const MAX_DATE = moment().format(DATEPICKER_DATE_FORMAT);

export default function FilterDateRange({ condition, onApplyDateRange, query, customDateOptions }) {
  const { setError } = useContext(FilterErrorContext);

  // If we have any additional date options, we'll need to include and sort them
  const DateOptionsToUse = customDateOptions || DATE_OPTIONS;

  // we'll need this to do some of that vanilla stuff
  const container = useRef();

  const isOnChange = (e) => onApplyDateRange(e.target.value);

  const onChange = (date) => {
    const d = moment(date, DATE_DISPLAY_FORMAT);

    if (!d.isValid()) {
      setError('Please enter a valid date');
      return;
    }

    if (d.isBefore(moment(MIN_DATE).format(DATEPICKER_DATE_FORMAT))) {
      setError('Please enter a valid date');
      return;
    }

    if (d.isAfter(moment(MAX_DATE).format(DATEPICKER_DATE_FORMAT))) {
      setError('Please enter a valid date');
      return;
    }

    onApplyDateRange(d.format(QUERY_DATE_FORMAT));
    setError('');
  };

  let defaultValue = '';

  if (query && moment(query, QUERY_DATE_FORMAT).isValid()) {
    defaultValue = moment(query, QUERY_DATE_FORMAT).format(DATEPICKER_DATE_FORMAT);
  }

  switch (condition) {
    case 'is': {
      const selectedValue = Array.isArray(query) ? query[0] : query;
      // Built-in options use a stable semantic key as the option value.
      // customDateOptions callers manage their own values, so we keep their existing `value` field.
      const getOptVal = (opt) => (customDateOptions ? opt.value : opt.key);
      return (
        <>
          <label htmlFor="filter-date-range" className="usa-sr-only">
            date
          </label>
          <Dropdown id="filter-date-range" name="filter-date-range" onChange={isOnChange} value={selectedValue}>
            {DateOptionsToUse.map((dateOption) => (
              <option key={getOptVal(dateOption)} value={getOptVal(dateOption)}>
                {dateOption.label}
              </option>
            ))}
          </Dropdown>
        </>
      );
    }

    case 'is within':
      return <DateRangePicker query={query} onApply={onApplyDateRange} />;
    case 'is on or before':
      return (
        <span ref={container}>
          <label htmlFor="filter-date-range" className="usa-sr-only">
            date
          </label>
          <DatePicker
            key="date-range-before"
            id="filter-date-range"
            name="filter-date-range"
            onChange={onChange}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            defaultValue={defaultValue}
          />
        </span>
      );
    case 'is on or after':
      return (
        <span ref={container}>
          <label htmlFor="filter-date-range" className="usa-sr-only">
            date
          </label>
          <DatePicker
            key="date-range-after"
            id="filter-date-range"
            name="filter-date-range"
            onChange={onChange}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            defaultValue={defaultValue}
          />
        </span>
      );
    default:
      return <input />;
  }
}

FilterDateRange.propTypes = {
  condition: PropTypes.string.isRequired,
  onApplyDateRange: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  customDateOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
};

FilterDateRange.defaultProps = {
  customDateOptions: null,
};
