/* eslint-disable jsx-a11y/label-has-associated-control */
import React, {
  useState, useEffect,
} from 'react';
import PropTypes from 'prop-types';
import {
  format, parse, isValid, isBefore, isAfter, differenceInDays, addDays,
} from 'date-fns';
import { Button } from '@trussworks/react-uswds';
import DatePicker from '../DatePicker';
import './DateRangePicker.scss';
import { DATE_DISPLAY_FORMAT } from '../../Constants';

const QUERY_DATE_FORMAT = 'yyyy/MM/dd';
export default function DateRangePicker({ onApply, query }) {
  let defaultDateRange = {
    startDate: '',
    endDate: '',
    endDateKey: 'end-date',
    startDateKey: 'start-date',
  };

  if (query && query.split('-').length === 2) {
    const [start, end] = query.split('-');
    defaultDateRange = {
      startDate: format(parse(start, QUERY_DATE_FORMAT, new Date()), DATE_DISPLAY_FORMAT),
      endDate: format(parse(end, QUERY_DATE_FORMAT, new Date()), DATE_DISPLAY_FORMAT),
      endDateKey: 'end-date',
      startDateKey: 'start-date',
    };
  }

  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [hidden, setHidden] = useState(true);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [range, setRange] = useState('');

  useEffect(() => {
    const { startDate, endDate } = dateRange;
    const start = parse(startDate, DATE_DISPLAY_FORMAT, new Date());
    const end = parse(endDate, DATE_DISPLAY_FORMAT, new Date());

    if (isValid(start) && isValid(end)) {
      const rangeStr = `${format(start, QUERY_DATE_FORMAT)}-${format(end, QUERY_DATE_FORMAT)}`;
      setRange(rangeStr);
    } else {
      setRange('');
    }
  }, [dateRange]);

  const toggleHidden = () => {
    if (!startDateError && !endDateError) {
      setHidden(!hidden);
    }
  };

  const onChangeStartDate = (date) => {
    const { startDate, endDate } = dateRange;

    const newStartDate = parse(date, DATE_DISPLAY_FORMAT, new Date());

    if (isValid(newStartDate)) {
      const startDateKey = `start-date-${format(newStartDate, DATE_DISPLAY_FORMAT)}`;
      const currentEndDate = parse(endDate, DATE_DISPLAY_FORMAT, new Date());
      const isBeforeMax = isBefore(currentEndDate, newStartDate);

      if (isBeforeMax && endDate) {
        const currentStartDate = parse(startDate, DATE_DISPLAY_FORMAT, new Date());
        const diff = differenceInDays(currentEndDate, currentStartDate);
        let newEndDate = addDays(newStartDate, diff);

        if (isAfter(newEndDate, new Date())) {
          newEndDate = new Date();
        }

        const newEndDateKey = `end-date-${format(newEndDate, DATE_DISPLAY_FORMAT)}`;

        setDateRange({
          endDate: format(newEndDate, DATE_DISPLAY_FORMAT),
          startDate: format(newStartDate, DATE_DISPLAY_FORMAT),
          endDateKey: newEndDateKey,
          startDateKey,
        });
      } else {
        setDateRange({
          ...dateRange,
          startDate: format(newStartDate, DATE_DISPLAY_FORMAT),
          startDateKey,
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

  const onApplyClick = () => {
    if (range && !startDateError && !endDateError) {
      // if we're all clear, then onApply
      onApply(range);
      setHidden(true);
    } else {
      const { startDate, endDate } = dateRange;

      if (!startDate) {
        setStartDateError('Please enter a valid start date');
      }

      if (!endDate) {
        setEndDateError('Please enter a valid end date');
      }
    }
  };

  const {
    startDate, endDate, endDateKey, startDateKey,
  } = dateRange;

  return (
    <div
      className="ttahub-custom-date-range-picker position-relative"
    >
      <button aria-label="change custom date range" type="button" className="usa-select text-left" aria-expanded={!hidden} aria-controls="custom-date-range" onClick={toggleHidden}>
        { startDate && endDate ? `${startDate}-${endDate}` : 'Custom date range' }
      </button>
      <fieldset id="custom-date-range" className="width-mobile border-0 bg-white margin-0 margin-top-1 padding-2 ttahub-custom-date-range-picker-fields position-absolute" hidden={hidden}>

        <label className="usa-label margin-top-0" id="startDateLabel" htmlFor="start-date">Start date</label>
        <span className="usa-hint" id="custom-date-range-hint">mm/dd/yyyy (after 08/31/2020)</span>
        <DatePicker
          aria-describedby="startDateLabel custom-date-range-hint"
          id="start-date"
          name="startDate"
          defaultValue={startDate}
          onChange={onChangeStartDate}
          error={startDateError}
          setError={setStartDateError}
          datePickerKey={startDateKey}
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
          error={endDateError}
          setError={setEndDateError}
        />
        <Button className="margin-top-3" onClick={onApplyClick} aria-label="apply date range changes">Apply</Button>
      </fieldset>
    </div>
  );
}

DateRangePicker.propTypes = {
  onApply: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
};
