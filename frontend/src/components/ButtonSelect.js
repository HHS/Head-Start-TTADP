import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import DropdownMenu from './DropdownMenu';
import './ButtonSelect.css';
import './DateRangeSelect.css';

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
  const [selectedItem, setSelectedItem] = useState(initialValue);

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
  };

  // get label text
  const label = options.find((option) => option.value === applied);

  const ariaLabel = `toggle ${ariaName}`;

  return (
    <DropdownMenu
      buttonText={label ? label.label : options[0].label}
      buttonAriaLabel={ariaLabel}
      styleAsSelect={styleAsSelect}
      disabled={disabled}
      onApply={onApplyClick}
      menuName={ariaName}
      applyButtonAria={`Apply filters for the ${ariaName}`}
    >
      <div role="group" aria-describedby={labelId}>
        <span className="smart-hub--button-select-menu-label sr-only" id={labelId}>
          <strong>{labelText}</strong>
        </span>
        <fieldset className="margin-0 border-0 padding-0" data-testid="button-select-button-group">
          { options.map((option) => (
            <button
              type="button"
              aria-pressed={option.value === checked}
              className="smart-hub--button smart-hub--button-select-range-button"
              key={option.value}
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

      </div>
    </DropdownMenu>
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
