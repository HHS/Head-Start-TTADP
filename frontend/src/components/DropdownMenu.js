import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './DropdownMenu.css';
import triangleDown from '../images/triange_down.png';

export default function DropdownMenu({
  buttonText,
  buttonAriaLabel,
  styleAsSelect,
  blurValidations,
  children,
  disabled,
  applyButtonText,
  applyButtonAria,
  onApply,
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

  /**
   * Close the menu on blur, with some extenuating circumstance
   *
   * @param {Event} e
   * @returns void
   */
  const onBlur = (e) => {
    // if we're within the same menu, do nothing
    if (e.relatedTarget && e.relatedTarget.matches('.smart-hub--dropdown-menu--contents *')) {
      return;
    }

    if (blurValidations(e)) {
      setMenuIsOpen(false);
    }
  };

  const onClick = () => {
    setMenuIsOpen(!menuIsOpen);
  };

  const onApplyClick = () => {
    onApply();
    setMenuIsOpen(false);
  };

  const buttonClasses = styleAsSelect ? 'usa-select' : 'usa-button';

  return (
    <div className="smart-hub--dropdown-menu position-relative margin-left-1" onBlur={onBlur}>
      <button
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={`${buttonClasses} smart-hub--dropdown-menu-toggle-btn display-flex`}
        aria-label={buttonAriaLabel}
        type="button"
        disabled={disabled}
      >
        {buttonText}
        {menuIsOpen}
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      <div className="smart-hub--dropdown-menu--contents" hidden={menuIsOpen && !disabled}>
        {children}
        <button
          type="button"
          className="usa-button smart-hub--button margin-2"
          onClick={onApplyClick}
          aria-label={applyButtonAria}
        >
          {applyButtonText}
        </button>
      </div>
    </div>
  );
}

DropdownMenu.propTypes = {
  children: PropTypes.node.isRequired,
  buttonText: PropTypes.string.isRequired,
  buttonAriaLabel: PropTypes.string,
  disabled: PropTypes.bool,
  styleAsSelect: PropTypes.bool,
  blurValidations: PropTypes.func,
  applyButtonText: PropTypes.string,
  applyButtonAria: PropTypes.string,
  onApply: PropTypes.func.isRequired,
};

DropdownMenu.defaultProps = {
  buttonAriaLabel: '',
  disabled: false,
  styleAsSelect: false,
  blurValidations: () => true,
  applyButtonAria: 'Apply',
  applyButtonText: 'Apply',
};
