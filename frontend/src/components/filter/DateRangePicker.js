/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
} from '@trussworks/react-uswds';
import moment from 'moment';
import DatePicker from '../DatePicker';
import './DateRangePicker.css';

import { DATE_DISPLAY_FORMAT } from '../../Constants';

const QUERY_DATE_FORMAT = 'YYYY/MM/DD';

export default function DateRangePicker({ onApply, query }) {
  let defaultDateRange = {
    startDate: '',
    endDate: '',
    endDateKey: 'end-date',
  };

  if (query && query.split('-').length === 2) {
    const [start, end] = query.split('-');
    defaultDateRange = {
      startDate: moment(start, QUERY_DATE_FORMAT).format(DATE_DISPLAY_FORMAT),
      endDate: moment(end, QUERY_DATE_FORMAT).format(DATE_DISPLAY_FORMAT),
      endDateKey: 'end-date',
    };
  }

  const [hidden, setHidden] = useState(true);
  const [error, setError] = useState({
    className: '',
    message: '',
    icon: false,
  });
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [range, setRange] = useState('');

  useEffect(() => {
    const { startDate, endDate } = dateRange;
    const start = moment(startDate, DATE_DISPLAY_FORMAT);
    const end = moment(endDate, DATE_DISPLAY_FORMAT);

    if (start.isValid() && end.isValid()) {
      const rangeStr = `${start.format(QUERY_DATE_FORMAT)}-${end.format(QUERY_DATE_FORMAT)}`;
      setRange(rangeStr);
    } else {
      setRange('');
    }
  }, [dateRange]);

  const customDatePicker = useRef();

  const validate = () => {
    const { startDate, endDate } = dateRange;

    if (!startDate) {
      setError({
        message: 'Please enter a start date',
        className: 'start-date',
        icon: true,
      });
      return;
    }

    if (!endDate) {
      setError({
        message: 'Please enter an end date',
        className: 'end-date',
        icon: true,
      });
      return;
    }

    // We're inspecting the validity state of the input as recommended by Truss in their docs
    // for this component.
    if (
      customDatePicker.current
      && customDatePicker.current.querySelector('input:invalid')
    ) {
      const input = customDatePicker.current.querySelector('input:invalid');
      setError({
        className: input.getAttribute('id'),
        message: 'Please enter a date range between 09/01/2020 and today, in the format mm/dd/yyyy',
        icon: false,
      });
      return;
    }

    setError({
      className: '',
      message: '',
      icon: false,
    });
  };

  const toggleHidden = () => {
    // validate if hidden is true
    if (!hidden) {
      validate();
    }

    // if we're open and there is an error
    // we shouldn't hide the menu
    if (!hidden && error.className) {
      return;
    }

    setHidden(!hidden);
  };

  const onChangeStartDate = (date) => {
    const { startDate, endDate } = dateRange;

    const newStartDate = moment(date, DATE_DISPLAY_FORMAT);

    if (newStartDate.isValid()) {
      const currentEndDate = moment(endDate, DATE_DISPLAY_FORMAT);
      const isBeforeMax = currentEndDate.isBefore(newStartDate);

      if (isBeforeMax && endDate) {
        const currentStartDate = moment(startDate, DATE_DISPLAY_FORMAT);
        const diff = currentEndDate.diff(currentStartDate, 'days');
        let newEndDate = moment(newStartDate).add(diff, 'days');

        if (newEndDate.isAfter(moment())) {
          newEndDate = moment();
        }

        const newEndDateKey = `end-date-${newEndDate.format(DATE_DISPLAY_FORMAT)}`;

        setDateRange({
          endDate: newEndDate.format(DATE_DISPLAY_FORMAT),
          startDate: newStartDate.format(DATE_DISPLAY_FORMAT),
          endDateKey: newEndDateKey,
        });
      } else {
        setDateRange({
          ...dateRange,
          startDate: newStartDate.format(DATE_DISPLAY_FORMAT),
        });
      }
    }
  };

  const onChangeEndDate = (endDate) => {
    setDateRange({
      ...dateRange,
      endDateKey: 'end-date',
      endDate,
    });
  };

  const onBlur = (e) => {
    // no need to fire anything if the menu is closed
    if (!hidden) {
    // if( clicking on something within the item )
      if (
        e.relatedTarget
        && customDatePicker.current
        && customDatePicker.current.contains(e.relatedTarget)
      ) {
        return;
      }

      // validate our inputs and set an error if one is found
      validate();

      // if we set an error in the last step, we don't fire the blur behavior
      if (error.className) {
        return;
      }

      // if we've got everything undercontrol
      if (range) {
        // if we're all clear, then onApply
        onApply(range);
        setHidden(true);
      }
    }
  };

  const { startDate, endDate, endDateKey } = dateRange;

  return (
    <div
      className={`ttahub-custom-date-range-picker position-relative ${error.className ? `ttahub-custom-date-range-picker--error-${error.className}` : ''}`}
      onBlur={onBlur}
      ref={customDatePicker}
    >
      <button aria-label="change custom date range" type="button" className="usa-select text-left" aria-expanded={!hidden} aria-controls="custom-date-range" onClick={toggleHidden}>
        { startDate && endDate ? `${startDate}-${endDate}` : 'Custom date range' }
      </button>
      <fieldset id="custom-date-range" className="width-mobile border-0 bg-white margin-0 margin-top-1 padding-2 ttahub-custom-date-range-picker-fields position-absolute" hidden={hidden}>
        { error.message
          && (
          <Alert type="error" noIcon={!error.icon} className="margin-bottom-2">
            {error.message}
          </Alert>
          )}

        <label className="usa-label margin-top-0" id="startDateLabel" htmlFor="start-date">Start date</label>
        <span className="usa-hint" id="custom-date-range-hint">mm/dd/yyyy</span>
        <DatePicker
          aria-describedby="startDateLabel custom-date-range-hint"
          id="start-date"
          name="startDate"
          defaultValue={startDate}
          onChange={onChangeStartDate}
        />
        <label id="endDateLabel" className="usa-label" htmlFor="end-date">End date</label>
        <span className="usa-hint">mm/dd/yyyy</span>
        <DatePicker
          datePickerKey={endDateKey}
          aria-describedby="endDateLabel custom-date-range-hint"
          id="end-date"
          name="endDate"
          defaultValue={endDate}
          minDate={startDate}
          onChange={onChangeEndDate}
        />
      </fieldset>
    </div>
  );
}

DateRangePicker.propTypes = {
  onApply: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
};
