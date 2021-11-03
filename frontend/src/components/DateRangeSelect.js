import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import {
  SingleDatePicker, isInclusivelyBeforeDay,
} from 'react-dates';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@trussworks/react-uswds';
import {
  DATETIME_DATE_FORMAT, DATE_FORMAT,
} from './constants';
import { DATE_FMT, EARLIEST_INC_FILTER_DATE } from '../Constants';
import triangleDown from '../images/triange_down.png';

// I think we need 'em both
import './ButtonSelect.css';
import './DateRangeSelect.css';

/**
 * This function accepts a configuration object, the keys of which are all optional
 *
 *  if either of these are true, the function will return the date string for that automatically
 *  lastThirtyDays
 *  yearToDate
 *
 *  (Logically, if they are both true, that doesn't make sense,
 *   but last thirty days will be returned)
 *
 *   withSpaces - Should there be spaces in between the two dates and the seperator
 *
 *   sep - what character or string should seperate the two dates
 *
 *   forDateTime: returns the string in DATETIME_DATE_FORMAT, otherwise DATE_FORMAT is used
 *
 *   string - the string to be parsed to return a formatted date
 *   It's expected to be in DATETIME_DATE_FORMAT
 *
 * @param {Object} format
 * @returns a date string
 */
export function formatDateRange(format = {
  lastThirtyDays: false,
  yearToDate: false,
  withSpaces: false,
  forDateTime: false,
  sep: '-',
  string: '',
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

  if (format.yearToDate) {
    const today = moment();
    const firstDayOfYear = moment().startOf('year');

    if (format.withSpaces) {
      return `${firstDayOfYear.format(selectedFormat)} ${sep} ${today.format(selectedFormat)}`;
    }

    return `${firstDayOfYear.format(selectedFormat)}${sep}${today.format(selectedFormat)}`;
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

const OPTIONS = [
  {
    label: 'Last 30 Days',
    value: 1,
    range: formatDateRange({ lastThirtyDays: true, forDateTime: true }),
  },
  {
    label: 'Custom Date Range',
    value: 2,
    range: '',
  },
];

const CUSTOM_DATE_RANGE = OPTIONS[1].value;

/**
 *
 * @param {*} props
 * @returns JSX object
 */

function DateRangeSelect(props) {
  const {
    options,
    styleAsSelect,
    updateDateRange,
    disabled,
  } = props;

  const [selectedItem, setSelectedItem] = useState(1);
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [showDateError, setShowDateError] = useState(false);

  // to handle the internal range
  const [startDate, setStartDate] = useState();
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDate, setEndDate] = useState();
  const [endDateFocused, setEndDateFocused] = useState(false);

  const startDatePickerId = 'startDatePicker';

  /** when to focus on the start date input */
  useEffect(() => {
    if (selectedItem && selectedItem === CUSTOM_DATE_RANGE) {
      const input = document.getElementById(startDatePickerId);
      if (input) {
        input.focus();
      }
    }
  }, [selectedItem, startDatePickerId]);

  /**
   * apply the selected item and close the menu
   *
   */
  const onApplyClick = () => {
    if (selectedItem && selectedItem === CUSTOM_DATE_RANGE) {
      const range = `${startDate ? startDate.format(DATE_FMT) : ''}-${endDate ? endDate.format(DATE_FMT) : ''}`;
      const isValidDateRange = range.trim().split('-').filter((str) => str !== '').length === 2;

      if (!isValidDateRange) {
        setShowDateError(true);
        return;
      }

      updateDateRange(range);
    } else if (selectedItem) {
      const option = options.find((o) => selectedItem === o.value);
      if (option) {
        const { range } = option;
        updateDateRange(range);
      }
    }
    setMenuIsOpen(false);
  };

  /**
   * Close the menu on escape key
   * @param {Event} e
   */
  const onKeyDown = (e) => {
    if (e.keyCode === 27) {
      setMenuIsOpen(false);
    }
  };

  /**
   * Close the menu on blur, with some extenuating circumstance
   *
   * @param {Event} e
   * @returns void
   */
  const onBlur = (e) => {
    // if we're within the same menu, do nothing
    if (e.relatedTarget && e.relatedTarget.matches('.smart-hub--button-select-menu *')) {
      return;
    }

    // if we've a date range, also do nothing on blur when we click on those
    if (e.target.matches('.CalendarDay, .DayPickerNavigation, .DayPickerNavigation_button')) {
      return;
    }

    setMenuIsOpen(false);
    setShowDateError(false);
  };

  /**
   * @param {Object} day moment object
   * @param {String} startOrEnd either "start" or "end"
   * returns bool
   */

  // eslint-disable-next-line no-unused-vars
  const isOutsideRange = (day, startOrEnd) => {
    if (startOrEnd === 'start') {
      return isInclusivelyBeforeDay(day, EARLIEST_INC_FILTER_DATE)
        || (endDate && day.isAfter(endDate));
    }

    return isInclusivelyBeforeDay(day, EARLIEST_INC_FILTER_DATE)
      || (startDate && day.isBefore(startDate));
  };

  // get label text
  const label = options.find((option) => option.value === selectedItem.value);

  const buttonClasses = styleAsSelect ? 'usa-select' : 'usa-button';

  const ariaLabel = `${menuIsOpen ? 'press escape to close ' : 'Open '} date range select menu`;

  return (
    <div className="margin-left-1" onBlur={onBlur} data-testid="data-sort">
      <button
        onClick={setMenuIsOpen}
        onKeyDown={onKeyDown}
        className={`${buttonClasses} smart-hub--button-select-toggle-btn display-flex`}
        aria-label={ariaLabel}
        type="button"
        disabled={disabled}
      >
        {label ? label.label : options[0].label}
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      { menuIsOpen && !disabled
        ? (
          <div className="smart-hub--button-select-menu" role="group" aria-describedby="dateRangeSelectLabel">
            <span className="smart-hub--button-select-menu-label" id="dateRangeSelectLabel">
              <strong>Choose activity start date range</strong>
            </span>
            <fieldset className="margin-0 border-0 padding-0">
              { options.map((option) => (
                <button
                  type="button"
                  aria-pressed={option.value === selectedItem}
                  className="smart-hub--button smart-hub--button-select-range-button"
                  key={option.value}
                  onKeyDown={onKeyDown}
                  aria-label={`Select to view data from ${option.label}. Select Apply filters button to apply selection`}
                  onClick={() => {
                    setSelectedItem(option.value);
                  }}
                >
                  {option.label}
                  {option.value === selectedItem.value ? <FontAwesomeIcon className="smart-hub--button-select-checkmark" size="1x" color="#005ea2" icon={faCheck} /> : null}
                </button>
              ))}

              { selectedItem && selectedItem === CUSTOM_DATE_RANGE
                ? (
                  <div className="smart-hub--button-select-menu-date-picker">
                    { showDateError ? (
                      <div className="usa-alert usa-alert--warning usa-alert--no-icon margin-top-1 margin-0" role="alert">
                        <p className="usa-alert__text padding-1">
                          Reports are available from 09/01/2020.
                          <br />
                          Use the format MM/DD/YYYY.
                        </p>
                      </div>
                    ) : null }
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label className="display-block margin-top-2" htmlFor={startDatePickerId}>Start Date</label>
                    <p><small>mm/dd/yyyy</small></p>
                    <div className="smart-hub--button-select-menu-date-picker-single">
                      <SingleDatePicker
                        small
                        ariaLabel="start date"
                        id={startDatePickerId}
                        focused={startDateFocused}
                        numberOfMonths={1}
                        hideKeyboardShortcutsPanel
                        isOutsideRange={(day) => isOutsideRange(day, 'start')}
                        onFocusChange={({ focused }) => {
                          if (!focused) {
                            setStartDateFocused(focused);
                          }
                        }}
                        onDateChange={(selectedDate) => {
                          setStartDate(selectedDate);
                          setStartDateFocused(false);
                        }}
                        date={startDate}
                      />
                      <Button
                        onClick={() => setStartDateFocused(true)}
                        aria-label="open start date picker calendar"
                        type="button"
                        unstyled
                        className="margin-top-auto margin-bottom-auto font-sans-xs margin-left-1 smart-hub--filter-date-picker-button"
                      >
                        <FontAwesomeIcon size="1x" color="gray" icon={faCalendar} />
                      </Button>
                    </div>
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label className="display-block margin-top-2" htmlFor="endDatePicker">End Date</label>
                    <p><small>mm/dd/yyyy</small></p>
                    <div className="smart-hub--button-select-menu-date-picker-single">
                      <SingleDatePicker
                        ariaLabel="end date"
                        small
                        id="endDatePicker"
                        focused={endDateFocused}
                        numberOfMonths={1}
                        hideKeyboardShortcutsPanel
                        isOutsideRange={(day) => isOutsideRange(day, 'END')}
                        onFocusChange={({ focused }) => {
                          if (!focused) {
                            setEndDateFocused(focused);
                          }
                        }}
                        onDateChange={(selectedDate) => {
                          setEndDate(selectedDate);
                          setEndDateFocused(false);
                        }}
                        date={endDate}
                      />
                      <Button
                        onClick={() => setEndDateFocused(true)}
                        aria-label="open end date picker calendar"
                        type="button"
                        unstyled
                        className="margin-top-auto margin-bottom-auto font-sans-xs margin-left-1 smart-hub--filter-date-picker-button"
                      >
                        <FontAwesomeIcon size="1x" color="gray" icon={faCalendar} />
                      </Button>
                    </div>
                  </div>
                ) : null }
            </fieldset>
            <button
              type="button"
              onKeyDown={onKeyDown}
              className="usa-button smart-hub--button margin-2"
              onClick={onApplyClick}
              aria-label="Apply date range filters"
            >
              Apply
            </button>
          </div>
        )
        : null }

    </div>

  );
}

const optionProp = PropTypes.shape({
  value: PropTypes.number,
  label: PropTypes.string,
  range: PropTypes.string,
});

DateRangeSelect.propTypes = {
  // basic button select props
  options: PropTypes.arrayOf(optionProp),
  disabled: PropTypes.bool,
  styleAsSelect: PropTypes.bool,

  // props for handling the date range select
  updateDateRange: PropTypes.func.isRequired,
};

DateRangeSelect.defaultProps = {
  styleAsSelect: false,
  disabled: false,
  options: OPTIONS,
};

export default DateRangeSelect;
