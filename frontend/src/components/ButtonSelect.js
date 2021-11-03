import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import './ButtonSelect.css';
import './DateRangeSelect.css';
import triangleDown from '../images/triange_down.png';

/**
 *
 * @param {*} props
 * @returns
 */

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
    disabled,
  } = props;

  const [checked, setChecked] = useState(applied);
  const [selectedItem, setSelectedItem] = useState();
  const [menuIsOpen, setMenuIsOpen] = useState(false);
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
   * apply the selected item and close the menu
   *
   */
  const onApplyClick = () => {
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
        disabled={disabled}
      >
        {label ? label.label : options[0].label}
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      { menuIsOpen && !disabled
        ? (
          <div className="smart-hub--button-select-menu" role="group" aria-describedby={labelId}>
            <span className="smart-hub--button-select-menu-label sr-only" id={labelId}>
              <strong>{labelText}</strong>
            </span>
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
                  {option.value === checked ? <FontAwesomeIcon className="smart-hub--button-select-checkmark" size="1x" color="#005ea2" icon={faCheck} /> : null}
                </button>
              ))}
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
  disabled: PropTypes.bool,

  // style as a select box
  styleAsSelect: PropTypes.bool,
};

ButtonSelect.defaultProps = {
  styleAsSelect: false,
  disabled: false,
};

export default ButtonSelect;
