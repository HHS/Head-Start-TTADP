import React, { useState, createRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Checkbox } from '@trussworks/react-uswds';
import './CheckboxSelect.css';
import DropdownMenu from './DropdownMenu';

const optionProp = PropTypes.shape({
  value: PropTypes.number,
  label: PropTypes.string,
});

export function renderCheckboxes(
  options,
  checkboxes,
  prefix,
  handleCheckboxSelect,
  onBlur,
) {
  return options.map((option) => {
    const { label, value, endGroup } = option;
    const selectId = `${prefix}-${value}`;
    const isChecked = checkboxes[value] || false;
    return (
      <Checkbox
        className={endGroup ? 'checkbox--end-group' : ''}
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
    ariaName,
    disabled,
    hideToggleAll,
    showClear,
  } = props;

  const [toggleAllChecked, setToggleAllChecked] = useState(toggleAllInitial);
  const [checkboxes, setCheckboxes] = useState(makeCheckboxes(options, toggleAllChecked));

  const menu = createRef();

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
  };

  const canBlur = (e) => {
    if (e.relatedTarget === menu.current) {
      return false;
    }
    return true;
  };

  const label = toggleAllChecked ? toggleAllText : `${options.filter((option) => checkboxes[option.value]).map((option) => option.label).join(', ')}`;
  // html id for toggle all
  const toggleAllHtmlId = `${labelId}-toggle-all`;

  const ariaLabel = `toggle the ${ariaName}`;

  let ClearButton = null;

  if (showClear) {
    ClearButton = (
      <Button
        onClick={() => {
          setCheckboxes(makeCheckboxes(options, false));
          setToggleAllChecked(false);
        }}
        unstyled
      >
        Clear
      </Button>
    );
  }

  return (
    <DropdownMenu
      canBlur={canBlur}
      forwardedRef={menu}
      className="smart-hub--checkbox-select position-relative"
      buttonText={label}
      buttonAriaLabel={ariaLabel}
      styleAsSelect={styleAsSelect}
      disabled={disabled}
      onApply={onApplyClick}
      menuName={ariaName}
      applyButtonAria={`Apply filters for the ${ariaName}`}
      alternateActionButton={ClearButton}
    >
      <div className="smart-hub--button-select-menu" role="group" aria-describedby={labelId}>
        <span className="sr-only" id={labelId}>{labelText}</span>
        <fieldset className="border-0">
          {!hideToggleAll && (
          <div className="usa-checkbox smart-hub--checkbox-select-toggle-all">
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
          )}
          {renderCheckboxes(
            options,
            checkboxes,
            labelId,
            handleCheckboxSelect,
          )}
        </fieldset>
      </div>
    </DropdownMenu>
  );
}

CheckboxSelect.propTypes = {
  toggleAllInitial: PropTypes.bool.isRequired,
  toggleAllText: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(optionProp).isRequired,
  labelId: PropTypes.string.isRequired,
  labelText: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  ariaName: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  hideToggleAll: PropTypes.bool,

  // style as a select box
  styleAsSelect: PropTypes.bool,

  // show the clear button?
  showClear: PropTypes.bool,

};

CheckboxSelect.defaultProps = {
  disabled: false,
  styleAsSelect: false,
  hideToggleAll: false,
  showClear: false,
};
