/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker,
} from '@trussworks/react-uswds';

import './DateRangePicker.css';

export default function DateRangePicker({ onApply }) {
  const [hidden, setHidden] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const [endDateKey] = useState('end-date');

  useEffect(() => {
    onApply(dateRange);
  }, [dateRange, onApply]);

  const customDatePicker = useRef();

  const toggleHidden = () => setHidden(!hidden);

  const onChangeStartDate = (startDate) => {
    // logic to nuke the end-date

    setDateRange({
      ...dateRange,
      startDate,
    });
  };

  const onChangeEndDate = (endDate) => {
    setDateRange({
      ...dateRange,
      endDate,
    });
  };

  const validate = () => {
    const { startDate, endDate } = dateRange;

    if (!startDate) {
      setError('start-date');
    }

    if (!endDate) {
      setError('end-date');
    }
  };

  const onBlur = (e) => {
    // no need to fire anything if the menu is closed
    if (!hidden) {
    // if( clicking on something within the item )
    // return
      if (
        e.relatedTarget
        && customDatePicker.current
        && customDatePicker.current.contains(e.relatedTarget)
      ) {
        return;
      }

      validate();

      if (error) {
        return;
      }

      // if we're all clear, then onApply
      onApply(dateRange);
      setHidden(true);
    }
  };

  return (
    <div
      className={`ttahub-custom-date-range-picker position-relative ${error ? `ttahub-custom-date-range-picker--error-${error}` : ''}`}
      onBlur={onBlur}
      ref={customDatePicker}
    >
      <button type="button" className="usa-select text-left" aria-expanded={!hidden} aria-controls="custom-date-range" onClick={toggleHidden}>
        Custom date range
      </button>
      <div id="custom-date-range" className="bg-white border margin-top-1 padding-1 ttahub-custom-date-range-picker-fields position-absolute" hidden={hidden}>
        <label className="usa-label margin-top-0" id="startDateLabel" htmlFor="startDate">Start date</label>
        <span className="usa-hint" id="custom-date-range-hint">mm/dd/yyyy</span>
        <DatePicker
          aria-describedby="startDateLabel custom-date-range-hint"
          id="startDate"
          name="startDate"
          onChange={onChangeStartDate}
        />
        <label id="endDateLabel" className="usa-label" htmlFor="endDate">End date</label>
        <span className="usa-hint">mm/dd/yyyy</span>
        <DatePicker
          key={endDateKey}
          aria-describedby="endDateLabel custom-date-range-hint"
          id="endDate"
          name="endDate"
          onChange={onChangeEndDate}
        />
      </div>
    </div>
  );
}

DateRangePicker.propTypes = {
  onApply: PropTypes.func.isRequired,
};
