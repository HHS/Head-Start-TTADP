import React from 'react';
import PropTypes from 'prop-types';
import './DateRangeSelect.css';
import moment from 'moment';
import ButtonSelect from './ButtonSelect';
import { DATETIME_DATE_FORMAT, DATE_FORMAT, DATE_OPTIONS } from './constants';

export function formatDateRange(format = {
  lastThirtyDays: false, withSpaces: false, forDateTime: false, sep: '-', string: '',
}) {
  const selectedFormat = format.forDateTime ? DATETIME_DATE_FORMAT : DATE_FORMAT;

  let { sep } = format;

  if (!format.sep) {
    sep = '-';
  }
  if (format.lastThirtyDays) {
    const today = moment();
    const thirtyDaysAgo = moment().subtract(30, 'days');

    if (format.withSpaces) {
      return `${thirtyDaysAgo.format(selectedFormat)} ${sep} ${today.format(selectedFormat)}`;
    }

    return `${thirtyDaysAgo.format(selectedFormat)}${sep}${today.format(selectedFormat)}`;
  }

  if (format.string) {
    const dates = format.string.split('-');

    if (dates && dates.length > 1) {
      if (format.withSpaces) {
        return `${moment(dates[0], DATETIME_DATE_FORMAT).format(selectedFormat)} ${sep} ${moment(dates[1], DATETIME_DATE_FORMAT).format(selectedFormat)}`;
      }

      return `${moment(dates[0], DATETIME_DATE_FORMAT).format(selectedFormat)}${sep}${moment(dates[1], DATETIME_DATE_FORMAT).format(selectedFormat)}`;
    }
  }

  return '';
}

export default function DateRangeSelect(props) {
  const {
    onApply,
    selectedDateRangeOption,
    updateDateRange,
    dateRange,
    customDateRangeOption,
    styleAsSelect,
  } = props;

  const initialValue = {
    label: 'Last 30 Days',
    value: 1,
  };

  return (
    <ButtonSelect
      onApply={onApply}
      initialValue={initialValue}
      labelId="dateRangeOptionsLabel"
      labelText="Choose activity start date range."
      options={DATE_OPTIONS}
      applied={selectedDateRangeOption}
      hasDateRange
      customDateRangeOption={customDateRangeOption}
      updateDateRange={updateDateRange}
      dateRange={dateRange}
      startDatePickerId="dashboardStartDatePicker"
      endDatePickerId="dashboardEndDatePicker"
      ariaName="date range options menu"
      styleAsSelect={styleAsSelect}
    />
  );
}

DateRangeSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  selectedDateRangeOption: PropTypes.number.isRequired,
  updateDateRange: PropTypes.func.isRequired,
  dateRange: PropTypes.string.isRequired,
  customDateRangeOption: PropTypes.number.isRequired,
  styleAsSelect: PropTypes.bool.isRequired,
};
