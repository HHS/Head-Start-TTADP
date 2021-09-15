import React from 'react';
import PropTypes from 'prop-types';
import { DATE_OPTIONS } from '../constants';
import './DateRangeSelect.css';
import ButtonSelect from '../../../components/ButtonSelect';

export default function DateRangeSelect(props) {
  const {
    onApply,
    selectedDateRangeOption,
    updateDateRange,
    dateRange,
    customDateRangeOption,
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
    />
  );
}

DateRangeSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  selectedDateRangeOption: PropTypes.number.isRequired,
  updateDateRange: PropTypes.func.isRequired,
  dateRange: PropTypes.string.isRequired,
  customDateRangeOption: PropTypes.number.isRequired,
};
