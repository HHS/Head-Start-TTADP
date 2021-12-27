/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker,
  Dropdown,
} from '@trussworks/react-uswds';
import moment from 'moment';
import DateRangePicker from './DateRangePicker';
import { formatDateRange } from '../DateRangeSelect';
import './FilterDateRange.css';
import { DATE_DISPLAY_FORMAT } from '../../Constants';

const MIN_DATE = '2020-09-01';
const MAX_DATE = moment().format('YYYY-MM-DD');

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
  query,
}) {
  // we'll need this to do some of that vanilla stuff
  const container = useRef();

  const isOnChange = (e) => onApplyDateRange(e.target.value);

  const onChange = (date) => {
    // inspecting validity state per truss docs
    // without a ref to the actual input, I think this is the way to do it
    if (container.current && !container.current.querySelector('input:invalid')) {
      const d = moment(date, DATE_DISPLAY_FORMAT);
      if (d.isValid()) {
        onApplyDateRange(d.format('YYYY/MM/DD'));
      }
    }
  };

  switch (condition) {
    case 'In':
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

    case 'Is within':
      return (
        <DateRangePicker
          query={query}
          onApply={onApplyDateRange}
        />
      );
    case 'Is before':
      return (
        <span ref={container}>
          <label htmlFor="filter-date-range" className="sr-only">
            date
          </label>
          <DatePicker
            id="filter-date-range"
            name="filter-date-range"
            onChange={onChange}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            defaultValue={query}
          />
        </span>
      );
    case 'Is after':
      return (
        <span ref={container}>
          <label htmlFor="filter-date-range" className="sr-only">
            date
          </label>
          <DatePicker
            id="filter-date-range"
            name="filter-date-range"
            onChange={onChange}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            defaultValue={query}
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
