import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import {
  SingleDatePicker, isInclusivelyBeforeDay,
} from 'react-dates';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@trussworks/react-uswds';
import DropdownMenu from './DropdownMenu';
import { DATE_FORMAT } from './constants';
import { DATE_FMT as DATETIME_DATE_FORMAT, EARLIEST_INC_FILTER_DATE } from '../Constants';

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

  let firstDay;
  let secondDay;

  if (format.lastThirtyDays) {
    secondDay = moment();
    firstDay = moment().subtract(30, 'days');
  }

  if (format.yearToDate) {
    secondDay = moment();
    firstDay = moment().startOf('year');
  }

  if (format.string) {
    const dates = format.string.split('-');

    if (dates && dates.length > 1) {
      firstDay = moment(dates[0], DATETIME_DATE_FORMAT);
      secondDay = moment(dates[1], DATETIME_DATE_FORMAT);
    }
  }

  if (firstDay && secondDay) {
    if (format.withSpaces) {
      return `${firstDay.format(selectedFormat)} ${sep} ${secondDay.format(selectedFormat)}`;
    }

    return `${firstDay.format(selectedFormat)}${sep}${secondDay.format(selectedFormat)}`;
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
  const [showDateError, setShowDateError] = useState(false);

  const [dates, setDates] = useState({
    startDate: false,
    endDate: false,
  });

  // to handle the internal range
  const [startDateFocused, setStartDateFocused] = useState(false);
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
    const { startDate, endDate } = dates;
    if (selectedItem && selectedItem === CUSTOM_DATE_RANGE) {
      const range = `${startDate ? startDate.format(DATETIME_DATE_FORMAT) : ''}-${endDate ? endDate.format(DATETIME_DATE_FORMAT) : ''}`;
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
  };

  /**
   * Close the menu on blur, with some extenuating circumstance
   *
   * @param {Event} e
   * @returns bool, whether or not to blur
   */
  const canBlur = (e) => {
    // if we're within the same menu, do nothing
    if (e.relatedTarget && e.relatedTarget.matches('.smart-hub--button-select-menu *')) {
      return false;
    }

    // if we've a date range, also do nothing on blur when we click on those
    if (e.target.matches('.CalendarDay, .DayPickerNavigation, .DayPickerNavigation_button')) {
      return false;
    }

    setShowDateError(false);
    return true;
  };

  /**
   * @param {Object} day moment object
   * @param {String} startOrEnd either "start" or "end"
   * returns bool
   */

  const isOutsideRange = (day, startOrEnd) => {
    const { startDate } = dates;

    if (startOrEnd === 'start') {
      return isInclusivelyBeforeDay(day, EARLIEST_INC_FILTER_DATE);
    }

    return isInclusivelyBeforeDay(day, EARLIEST_INC_FILTER_DATE)
      || (startDate && day.isBefore(startDate));
  };

  // get label text
  const { label } = options.find((option) => option.value === selectedItem);
  const ariaLabel = 'Toggle the date range select menu';

  return (
    <DropdownMenu
      buttonText={label}
      buttonAriaLabel={ariaLabel}
      styleAsSelect={styleAsSelect}
      disabled={disabled}
      canBlur={canBlur}
      onApply={onApplyClick}
      menuName="Date range select menu"
      applyButtonAria="Apply date range filters"
    >
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
              aria-label={`Select to view data from ${option.label}. Select Apply filters button to apply selection`}
              onClick={() => {
                setSelectedItem(option.value);
              }}
            >
              {option.label}
              {option.value === selectedItem ? <FontAwesomeIcon className="smart-hub--button-select-checkmark" size="1x" color="#005ea2" icon={faCheck} /> : null}
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
                    onFocusChange={({ focused }) => {
                      if (!focused) {
                        setStartDateFocused(focused);
                      }
                    }}
                    isOutsideRange={(day) => isOutsideRange(day, 'start')}
                    onDateChange={(selectedDate) => {
                      const { startDate, endDate } = dates;
                      if (endDate && endDate.isBefore(selectedDate)) {
                        const diff = endDate.diff(startDate, 'days');
                        const newEnd = moment(selectedDate).add(diff, 'days');
                        setDates({ endDate: newEnd, startDate: selectedDate });
                      } else {
                        setDates({ ...dates, startDate: selectedDate });
                      }

                      setStartDateFocused(false);
                    }}
                    date={dates.startDate || null /* this is to prevent prop type warnings */}
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
                      const endDate = selectedDate;
                      setDates({ ...dates, endDate });
                      setEndDateFocused(false);
                    }}
                    date={dates.endDate || null /* this is to prevent prop type warnings */}
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
      </div>
    </DropdownMenu>

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
