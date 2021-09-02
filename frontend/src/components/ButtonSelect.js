import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DateRangePicker from './DateRangePicker';
import { CUSTOM_DATE_RANGE } from '../pages/RegionalDashboard/constants';
import './ButtonSelect.css';
import triangleDown from '../images/triange_down.png';
import check from '../images/check.svg';

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
    dateRangeShouldGainFocus,
    dateRangePickerId,
    dateRange,
  } = props;

  const [selectedItem, setSelectedItem] = useState();
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [range, setRange] = useState();
  const [showDateError, setShowDateError] = useState(false);

  /**
   * just so we always have something selected
   * */
  useEffect(() => {
    if (!selectedItem && !applied) {
      setSelectedItem(initialValue);
    }
  }, [applied, initialValue, selectedItem]);

  /**
   * we store the date range in here so that we can apply it up the chain
   * when the calendar control is updated
   */
  useEffect(() => {
    if (!range) {
      setRange(dateRange);
    }
  }, [range, dateRange]);

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
   * Update the local date range when the calendar control is updated
   * @param {string} query
   * @param {string} date
   */
  const onUpdateDateRange = (query, date) => {
    setRange(date);
    setShowDateError(false);
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
   * @returns
   */
  const onBlur = (e) => {
    // if we're within the same menu, do nothing
    if (e.relatedTarget && e.relatedTarget.matches('.smart-hub--button-select-menu *')) {
      return;
    }

    // if we've a date range, also do nothing on blur when we click on those
    if (e.target.matches('.DateRangePicker_picker *')) {
      return;
    }

    setMenuIsOpen(false);
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
            <span className="sr-only" id={labelId}>{labelText}</span>
            <fieldset className="border-0">
              { options.map((option) => (
                <button
                  type="button"
                  aria-pressed={option === selectedItem}
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
                  { option.value === applied ? <img className="smart-hub--button-select-checkmark" src={check} alt="" aria-hidden="true" /> : null }
                </button>
              ))}

              { hasDateRange && selectedItem && selectedItem.value === CUSTOM_DATE_RANGE
                ? (
                  <>
                    { showDateError ? (
                      <div className="usa-alert usa-alert--error margin-1" role="alert">
                        <div className="usa-alert__body">
                          <p className="usa-alert__text">
                            Please enter a valid date range
                          </p>
                        </div>
                      </div>
                    ) : null }
                    <DateRangePicker
                      id={dateRangePickerId}
                      query={dateRange}
                      onUpdateFilter={onUpdateDateRange}
                      classNames={['display-flex']}
                      gainFocus={dateRangeShouldGainFocus}
                    />
                  </>
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
  dateRangeShouldGainFocus: PropTypes.bool,
  dateRange: PropTypes.string,
  dateRangePickerId: PropTypes.string,
};

ButtonSelect.defaultProps = {
  styleAsSelect: false,
  hasDateRange: false,
  dateRangeShouldGainFocus: false,
  updateDateRange: () => {},
  dateRange: '',
  dateRangePickerId: '',
};

export default ButtonSelect;
