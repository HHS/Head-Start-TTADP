/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useMemo, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  DatePicker,
} from '@trussworks/react-uswds';

import './DateRangePicker.css';
import moment from 'moment';
import { DATE_DISPLAY_FORMAT } from '../../Constants';

export default function DateRangePicker({ onApply, query }) {
  // check to see if the query is splittable
  // eslint-disable-next-line prefer-const
  let [start, end] = query.split('-').map((d) => {
    const m = moment(d, 'YYYY/MM/DD');
    if (m.isValid()) {
      return {
        default: m.format('YYYY-MM-DD'),
        initial: m.format('MM/DD/YYYY'),
      };
    }
    return {
      default: '',
      initial: '',
    };
  });

  if (!end) {
    end = {
      default: '',
      initial: '',
    };
  }

  const [hidden, setHidden] = useState(true);
  const [error, setError] = useState({
    className: '',
    message: '',
    icon: false,
  });
  const [dateRange, setDateRange] = useState({
    startDate: start.initial,
    endDate: end.initial,
    endDateKey: 'end-date',
  });

  const tomorrow = useMemo(() => moment().add(1, 'days').format('YYYY-MM-DD'), []);

  const formatted = useMemo(() => {
    const formattedValues = {
      startDate: '',
      endDate: '',
      dateRange: '',
    };

    const { startDate, endDate } = dateRange;

    let sd;
    let ed;

    if (startDate) {
      sd = moment(startDate, DATE_DISPLAY_FORMAT);
      if (sd.isValid()) {
        formattedValues.startDate = sd.format('YYYY-MM-DD');
      }
    }

    if (endDate) {
      ed = moment(endDate, DATE_DISPLAY_FORMAT);
      if (ed.isValid()) {
        formattedValues.endDate = ed.format('YYYY-MM-DD');
      }
    }

    if (startDate && endDate && sd.isValid() && ed.isValid()) {
      formattedValues.dateRange = `${sd.format('YYYY/MM/DD')}-${ed.format('YYYY/MM/DD')}`;
    }

    return formattedValues;
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

  const onChangeStartDate = (startDate) => {
    let { endDate, endDateKey } = dateRange;

    // knock knock its the validity inspector
    const { valid } = document.querySelector('#start-date').validity;

    if (valid) {
      const newStartDate = moment(startDate, DATE_DISPLAY_FORMAT);
      const currentStartDate = moment(startDate, DATE_DISPLAY_FORMAT);
      const currentEndDate = moment(endDate, DATE_DISPLAY_FORMAT);
      const isBeforeMax = currentEndDate.isBefore(newStartDate);

      if (isBeforeMax) {
        const diff = currentStartDate.diff(currentEndDate, 'days');
        endDate = newStartDate.add(diff, 'days').format(DATE_DISPLAY_FORMAT);
        endDateKey = `end-date-${endDate}`;
      }

      setDateRange({
        endDate,
        startDate: currentStartDate,
        endDateKey,
      });
    }
  };

  const onChangeEndDate = (endDate) => {
    const { valid } = document.querySelector('#end-date').validity;

    if (valid) {
      setDateRange({
        ...dateRange,
        endDate,
      });
    }
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

      // if so
      if (formatted.dateRange) {
        // if we're all clear, then onApply
        onApply(formatted.dateRange);
        setHidden(true);
      }
    }
  };

  const { endDateKey } = dateRange;

  return (
    <div
      className={`ttahub-custom-date-range-picker position-relative ${error.className ? `ttahub-custom-date-range-picker--error-${error.className}` : ''}`}
      onBlur={onBlur}
      ref={customDatePicker}
    >
      <button aria-label="change custom date range" type="button" className="usa-select text-left" aria-expanded={!hidden} aria-controls="custom-date-range" onClick={toggleHidden}>
        { query || 'Custom date range' }
      </button>
      <fieldset id="custom-date-range" className="width-mobile bg-white border margin-0 margin-top-1 padding-1 ttahub-custom-date-range-picker-fields position-absolute" hidden={hidden}>

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
          minDate="2020-09-01"
          maxDate={tomorrow}
          defaultValue={start.default}
          onChange={onChangeStartDate}
        />
        <label id="endDateLabel" className="usa-label" htmlFor="end-date">End date</label>
        <span className="usa-hint">mm/dd/yyyy</span>
        <DatePicker
          key={endDateKey}
          aria-describedby="endDateLabel custom-date-range-hint"
          id="end-date"
          name="endDate"
          defaultValue={end.default}
          minDate={formatted.startDate}
          maxDate={tomorrow}
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
