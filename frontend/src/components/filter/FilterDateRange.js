/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker,
  Dropdown,
} from '@trussworks/react-uswds';
import {
  format, parse, isValid, isBefore, isAfter,
} from 'date-fns';
import DateRangePicker from './DateRangePicker';
import { formatDateRange } from '../../utils';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import FilterErrorContext from './FilterErrorContext';

const QUERY_DATE_FORMAT = 'yyyy/MM/dd';
const DATEPICKER_DATE_FORMAT = 'yyyy-MM-dd';
const MIN_DATE = '2020-09-01';
const MAX_DATE = format(new Date(), DATEPICKER_DATE_FORMAT);

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
  customDateOptions,
}) {
  const { setError } = useContext(FilterErrorContext);

  // If we have any additional date options, we'll need to include and sort them
  const DateOptionsToUse = customDateOptions || DATE_OPTIONS;

  // we'll need this to do some of that vanilla stuff
  const container = useRef();

  const isOnChange = (e) => onApplyDateRange(e.target.value);

  const onChange = (date) => {
    const d = parse(date, DATE_DISPLAY_FORMAT, new Date());

    if (!isValid(d)) {
      setError('Please enter a valid date');
      return;
    }

    if (isBefore(d, parse(MIN_DATE, 'yyyy-MM-dd', new Date()))) {
      setError('Please enter a valid date');
      return;
    }

    if (isAfter(d, parse(MAX_DATE, DATEPICKER_DATE_FORMAT, new Date()))) {
      setError('Please enter a valid date');
      return;
    }

    onApplyDateRange(format(d, QUERY_DATE_FORMAT));
    setError('');
  };

  let defaultValue = '';

  if (query) {
    const parsedQuery = parse(query, QUERY_DATE_FORMAT, new Date());
    if (isValid(parsedQuery)) {
      defaultValue = format(parsedQuery, DATEPICKER_DATE_FORMAT);
    }
  }

  switch (condition) {
    case 'is':
      return (
        <>
          <label htmlFor="filter-date-range" className="usa-sr-only">
            date
          </label>
          <Dropdown
            id="filter-date-range"
            name="filter-date-range"
            onChange={isOnChange}
          >
            {DateOptionsToUse.map(
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
  customDateOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })),
};

FilterDateRange.defaultProps = {
  customDateOptions: null,
};
