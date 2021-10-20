import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  SingleDatePicker, isInclusivelyBeforeDay,
} from 'react-dates';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@trussworks/react-uswds';
import { CUSTOM_DATE_RANGE } from './constants';
import { DATE_FMT, EARLIEST_INC_FILTER_DATE } from '../Constants';
import './ButtonSelect.css';
import triangleDown from '../images/triange_down.png';

function ButtonSelect(props) {
  const {
    options,
    onApply,
    labelId,
    styleAsSelect,
    initialValue,
    applied,
    labelText,
    ariaName,
    hasDateRange,
    updateDateRange,
    startDatePickerId,
    endDatePickerId,
    dateRange,
  } = props;

  const [checked, setChecked] = useState(applied);
  const [selectedItem, setSelectedItem] = useState();
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [range, setRange] = useState();
  const [showDateError, setShowDateError] = useState(false);

  const [startDate, setStartDate] = useState();
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDate, setEndDate] = useState();
  const [endDateFocused, setEndDateFocused] = useState(false);
  /**
   * just so we always have something selected
   * */
  useEffect(() => {
    if (!selectedItem && !applied) {
      setSelectedItem(initialValue);
    }
  }, [applied, initialValue, selectedItem]);

  /**
   * To calculate where the checkmark should go :)
   */

  useEffect(() => {
    if (selectedItem && selectedItem.value !== applied) {
      setChecked(selectedItem.value);
    } else {
      setChecked(applied);
    }
  }, [applied, selectedItem]);

  /**
   * we store the date range in here so that we can apply it up the chain
   * when the calendar control is updated
   */
  useEffect(() => {
    if (!range) {
      setRange(dateRange);
    }

    setRange(`${startDate ? startDate.format(DATE_FMT) : ''}-${endDate ? endDate.format(DATE_FMT) : ''}`);
  }, [range, dateRange, startDate, endDate]);

  /** when to focus on the start date input */
  useEffect(() => {
    if (hasDateRange && selectedItem && selectedItem.value === CUSTOM_DATE_RANGE) {
      const input = document.getElementById(startDatePickerId);
      if (input) {
        input.focus();
      }
    }
  }, [hasDateRange, selectedItem, startDatePickerId]);

  /**
   * apply the selected item and close the menu
   *
   * if we have a date picker and it's a custom range, also apply the
   * new date range
   */
  const onApplyClick = () => {
    if (hasDateRange && selectedItem && selectedItem.value === CUSTOM_DATE_RANGE) {
      const isValidDateRange = range.trim().split('-').filter((str) => str !== '').length === 2;

      if (!isValidDateRange) {
        setShowDateError(true);
        return;
      }

      updateDateRange(range);
    }

    onApply(selectedItem);
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
  const label = options.find((option) => option.value === applied);

  const buttonClasses = styleAsSelect ? 'usa-select' : 'usa-button';

  const ariaLabel = `${menuIsOpen ? 'press escape to close ' : 'Open '} ${ariaName}`;

  return (
    <div className="margin-left-1" onBlur={onBlur} data-testid="data-sort">
      <button
        onClick={setMenuIsOpen}
        onKeyDown={onKeyDown}
        className={`${buttonClasses} smart-hub--button-select-toggle-btn display-flex`}
        aria-label={ariaLabel}
        type="button"
      >
        {label ? label.label : options[0].label}
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      { menuIsOpen
        ? (
          <div className="smart-hub--button-select-menu" role="group" aria-describedby={labelId}>
            <span className={hasDateRange ? 'smart-hub--button-select-menu-label' : 'smart-hub--button-select-menu-label sr-only'} id={labelId}><strong>{labelText}</strong></span>
            <fieldset className="margin-0 border-0 padding-0">
              { options.map((option) => (
                <button
                  type="button"
                  aria-pressed={option.value === checked}
                  className="smart-hub--button smart-hub--button-select-range-button"
                  key={option.value}
                  onKeyDown={onKeyDown}
                  data-value={option.value}
                  aria-label={`Select to view data from ${option.label}. Select Apply filters button to apply selection`}
                  onClick={() => {
                    setSelectedItem(option);
                  }}
                >
                  {option.label}
                  { option.value === checked ? <FontAwesomeIcon className="smart-hub--button-select-checkmark" size="1x" color="#005ea2" icon={faCheck} /> : null }
                </button>
              ))}

              { hasDateRange && selectedItem && selectedItem.value === CUSTOM_DATE_RANGE
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
                    <label className="display-block margin-top-2" htmlFor={endDatePickerId}>End Date</label>
                    <p><small>mm/dd/yyyy</small></p>
                    <div className="smart-hub--button-select-menu-date-picker-single">
                      <SingleDatePicker
                        ariaLabel="end date"
                        small
                        id={endDatePickerId}
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
            <button type="button" onKeyDown={onKeyDown} className="usa-button smart-hub--button margin-2" onClick={onApplyClick} aria-label={`Apply filters for the ${ariaName}`}>Apply</button>
          </div>
        )
        : null }

    </div>

  );
}

const optionProp = PropTypes.shape({
  value: PropTypes.number,
  label: PropTypes.string,
});

ButtonSelect.propTypes = {
  options: PropTypes.arrayOf(optionProp).isRequired,
  labelId: PropTypes.string.isRequired,
  labelText: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  initialValue: optionProp.isRequired,
  applied: PropTypes.number.isRequired,
  ariaName: PropTypes.string.isRequired,

  // style as a select box
  styleAsSelect: PropTypes.bool,

  // props for handling the date range select
  hasDateRange: PropTypes.bool,
  updateDateRange: PropTypes.func,
  dateRange: PropTypes.string,
  startDatePickerId: PropTypes.string,
  endDatePickerId: PropTypes.string,
};

ButtonSelect.defaultProps = {
  styleAsSelect: false,
  hasDateRange: false,
  updateDateRange: () => {},
  dateRange: '',
  startDatePickerId: '',
  endDatePickerId: '',
};

export default ButtonSelect;
