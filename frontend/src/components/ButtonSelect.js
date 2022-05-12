import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import DropdownMenu from './DropdownMenu';
import './ButtonSelect.scss';
import colors from '../colors';

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
    className,
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
    return true;
  };

  // get label text
  const label = () => {
    const selected = options.find((option) => option.value === applied);

    if (selected) {
      return selected.label;
    }

    if (options[0] && options[0].label) {
      return options[0].label;
    }

    return '';
  };

  const ariaLabel = `toggle ${ariaName}`;

  return (
    <DropdownMenu
      buttonText={label()}
      buttonAriaLabel={ariaLabel}
      styleAsSelect={styleAsSelect}
      disabled={disabled}
      onApply={onApplyClick}
      menuName={ariaName}
      className={className}
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
              {option.value === checked ? <FontAwesomeIcon className="smart-hub--button-select-checkmark" size="1x" color={colors.ttahubMediumBlue} icon={faCheck} /> : null}
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
  className: PropTypes.string,

  // style as a select box
  styleAsSelect: PropTypes.bool,
};

ButtonSelect.defaultProps = {
  styleAsSelect: false,
  disabled: false,
  className: '',
};

export default ButtonSelect;
