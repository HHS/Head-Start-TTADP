/* eslint-disable jsx-a11y/label-has-associated-control */
import React, {
  useState, useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import DatePicker from '../DatePicker';
import './DateRangePicker.scss';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import {
  formatDateValue,
  formatDateValueFromFormat,
  now,
  parseDateTimeFromFormat,
} from '../../lib/dates';

const QUERY_DATE_FORMAT = 'YYYY/MM/DD';
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
      startDate: formatDateValueFromFormat(start, QUERY_DATE_FORMAT, DATE_DISPLAY_FORMAT),
      endDate: formatDateValueFromFormat(end, QUERY_DATE_FORMAT, DATE_DISPLAY_FORMAT),
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
    const start = parseDateTimeFromFormat(startDate, DATE_DISPLAY_FORMAT);
    const end = parseDateTimeFromFormat(endDate, DATE_DISPLAY_FORMAT);

    if (start && end) {
      const formattedStart = formatDateValue(start.toISO(), QUERY_DATE_FORMAT);
      const formattedEnd = formatDateValue(end.toISO(), QUERY_DATE_FORMAT);
      const rangeStr = `${formattedStart}-${formattedEnd}`;
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

    const newStartDate = parseDateTimeFromFormat(date, DATE_DISPLAY_FORMAT);

    if (newStartDate) {
      const startDateKey = `start-date-${formatDateValue(newStartDate.toISO(), DATE_DISPLAY_FORMAT)}`;
      const currentEndDate = parseDateTimeFromFormat(endDate, DATE_DISPLAY_FORMAT);
      const isBeforeMax = !!(currentEndDate && currentEndDate.toMillis() < newStartDate.toMillis());

      if (isBeforeMax && endDate) {
        const currentStartDate = (
          parseDateTimeFromFormat(startDate, DATE_DISPLAY_FORMAT)
          || newStartDate
        );
        const diff = Math.trunc(currentEndDate.diff(currentStartDate, 'days').days);
        let newEndDate = newStartDate.plus({ days: diff });

        if (newEndDate.toMillis() > now().toMillis()) {
          newEndDate = now();
        }

        const newEndDateKey = `end-date-${formatDateValue(newEndDate.toISO(), DATE_DISPLAY_FORMAT)}`;

        setDateRange({
          endDate: formatDateValue(newEndDate.toISO(), DATE_DISPLAY_FORMAT),
          startDate: formatDateValue(newStartDate.toISO(), DATE_DISPLAY_FORMAT),
          endDateKey: newEndDateKey,
          startDateKey,
        });
      } else {
        setDateRange({
          ...dateRange,
          startDate: formatDateValue(newStartDate.toISO(), DATE_DISPLAY_FORMAT),
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
