/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker,
  Dropdown,
} from '@trussworks/react-uswds';
import moment from 'moment';
import DateRangePicker from './DateRangePicker';
import { formatDateRange } from '../../utils';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import FilterErrorContext from './FilterErrorContext';

const QUERY_DATE_FORMAT = 'YYYY/MM/DD';
const DATEPICKER_DATE_FORMAT = 'YYYY-MM-DD';
const MIN_DATE = '2020-09-01';
const MAX_DATE = moment().format(DATEPICKER_DATE_FORMAT);

const DATE_OPTIONS = [
  {
    label: 'Last thirty days',
    value: formatDateRange({ lastThirtyDays: true, forDateTime: true }),
  },
  {
    label: 'Year to date',
    value: formatDateRange({ yearToDate: true, forDateTime: true }),
  },
];

export default function FilterDateRange({
  condition,
  onApplyDateRange,
  query,
}) {
  const { setError } = useContext(FilterErrorContext);

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
    case 'is':
      return (
        <>
          <label htmlFor="filter-date-range" className="sr-only">
            date
          </label>
          <Dropdown
            id="filter-date-range"
            name="filter-date-range"
            onChange={isOnChange}
          >
            {DATE_OPTIONS.map(
              (dateOption) => (
                <option
                  key={dateOption.value}
                  value={dateOption.value}
                >
                  {dateOption.label}
                </option>
              ),
            )}
          </Dropdown>
        </>
      );

    case 'is within':
      return (
        <DateRangePicker
          query={query}
          onApply={onApplyDateRange}
        />
      );
    case 'is on or before':
      return (
        <span ref={container}>
          <label htmlFor="filter-date-range" className="sr-only">
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
          <label htmlFor="filter-date-range" className="sr-only">
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
};
