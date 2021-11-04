import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './ButtonSelect.css';
import './DateRangeSelect.css';
import triangleDown from '../images/triange_down.png';

export default function Menu({
  buttonText, buttonAriaLabel, styleAsSelect, onBlur, children, disabled,
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  /**
   * Close the menu on escape key
   * @param {Event} e
   */
  const onKeyDown = (e) => {
    if (e.keyCode === 27) {
      setMenuIsOpen(false);
    }
  };

  const defaultOnBlur = () => {
    console.log(onBlur);
  };

  const buttonClasses = styleAsSelect ? 'usa-select' : 'usa-button';

  return (
    <div className="margin-left-1" onBlur={onBlur || defaultOnBlur}>
      <button
        onClick={setMenuIsOpen}
        onKeyDown={onKeyDown}
        className={`${buttonClasses} smart-hub--button-select-toggle-btn display-flex`}
        aria-label={buttonAriaLabel}
        type="button"
        disabled={disabled}
      >
        {buttonText}
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      { menuIsOpen && !disabled ? children : null }

    </div>
  );
}

Menu.propTypes = {
  children: PropTypes.node.isRequired,
  buttonText: PropTypes.string.isRequired,
  buttonAriaLabel: PropTypes.string,
  disabled: PropTypes.bool,
  styleAsSelect: PropTypes.bool,
  onBlur: PropTypes.func,
};

Menu.defaultProps = {
  buttonAriaLabel: '',
  disabled: false,
  styleAsSelect: false,
  onBlur: false,
};
