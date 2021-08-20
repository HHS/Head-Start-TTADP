import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@trussworks/react-uswds';
import triangleDown from '../images/triange_down.png';
import './CheckboxSelect.css';

export function renderCheckboxes(options, checkboxes, prefix, handleCheckboxSelect, onBlur) {
  return options.map((option) => {
    const { label, value } = option;
    const selectId = `${prefix}-${value}`;
    const isChecked = checkboxes[value] || false;

    return (
      <Checkbox
        key={selectId}
        id={selectId}
        label={label}
        value={value}
        checked={isChecked}
        onChange={handleCheckboxSelect}
        aria-label={`Select ${label}`}
        onBlur={onBlur}
      />
    );
  });
}

export const makeCheckboxes = (options, checked) => (
  options.reduce((obj, r) => ({ ...obj, [r.value]: checked }), {})
);

export default function CheckboxSelect(props) {
  const {
    options,
    onApply,
    labelId,
    toggleAllText,
    toggleAllInitial,
    styleAsSelect,
    labelText,
    ariaLabel,
  } = props;

  const [toggleAllChecked, setToggleAllChecked] = useState(toggleAllInitial);
  const [checkboxes, setCheckboxes] = useState(makeCheckboxes(options, toggleAllChecked));
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [preventBlur, setPreventBlur] = useState(false);

  // The all-reports checkbox can select/deselect all
  const toggleSelectAll = (event) => {
    const { target: { checked = null } = {} } = event;
    if (checked === true) {
      setCheckboxes(makeCheckboxes(options, true));
      setToggleAllChecked(true);
    } else {
      setCheckboxes(makeCheckboxes(options, false));
      setToggleAllChecked(false);
    }
  };

  const handleCheckboxSelect = (event) => {
    setToggleAllChecked(false);

    const { target: { checked = null, value = null } = {} } = event;

    if (checked === true) {
      setCheckboxes({ ...checkboxes, [value]: true });
    } else {
      setCheckboxes({ ...checkboxes, [value]: false });
    }
  };

  /**
   * apply the selected item and close the menu
   *
   */
  const onApplyClick = () => {
    const checked = Object.keys(checkboxes).filter((checkbox) => checkboxes[checkbox]);
    onApply(checked);
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
   * @returns
   */
  const onBlur = () => {
    if (preventBlur) {
      return;
    }

    setMenuIsOpen(false);
  };

  function onMouseHandler(e) {
    setPreventBlur(e.type === 'mouseenter');
  }

  const label = toggleAllChecked ? toggleAllText : `${options.filter((option) => checkboxes[option.value]).map((option) => option.label).join(', ')}`;
  // html id for toggle all
  const toggleAllHtmlId = `${labelId}-toggle-all`;

  const buttonClasses = styleAsSelect ? 'usa-select' : 'usa-button';

  return (
    <div className="margin-left-1" onBlur={onBlur} onMouseEnter={onMouseHandler} onMouseLeave={onMouseHandler}>
      <button
        onClick={setMenuIsOpen}
        onKeyDown={onKeyDown}
        className={`${buttonClasses} smart-hub--button-select-toggle-btn smart-hub--checkbox-select display-flex`}
        aria-label={ariaLabel}
        type="button"
      >
        <span>{label}</span>
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>
      { menuIsOpen
        ? (
          <div className="smart-hub--button-select-menu" role="group" aria-describedby={labelId}>
            <span className="sr-only" id={labelId}>{labelText}</span>
            <fieldset className="border-0">
              <div className="usa-checkbox" onBlur={onBlur}>
                <input
                  className="usa-checkbox__input"
                  type="checkbox"
                  checked={toggleAllChecked}
                  name={toggleAllHtmlId}
                  id={toggleAllHtmlId}
                  onChange={toggleSelectAll}
                />
                <label className="usa-checkbox__label" htmlFor={toggleAllHtmlId}>{toggleAllText}</label>
              </div>
              {renderCheckboxes(options, checkboxes, labelId, handleCheckboxSelect, onBlur)}
            </fieldset>
            <button type="button" onKeyDown={onKeyDown} className="usa-button smart-hub--button margin-2" onClick={onApplyClick} aria-label="Apply filters">Apply</button>
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

CheckboxSelect.propTypes = {
  toggleAllInitial: PropTypes.bool.isRequired,
  toggleAllText: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(optionProp).isRequired,
  labelId: PropTypes.string.isRequired,
  labelText: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,

  // style as a select box
  styleAsSelect: PropTypes.bool,

};

CheckboxSelect.defaultProps = {
  styleAsSelect: false,
};
