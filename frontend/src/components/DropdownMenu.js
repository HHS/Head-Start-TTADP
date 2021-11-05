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
  className,
  menuName,
  hideApply,
  menuState,
}) {
  let [menuIsOpen, setMenuIsOpen] = useState(false);

  if (menuState) {
    [menuIsOpen, setMenuIsOpen] = menuState;
  }

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

  const classNames = `${className} smart-hub--dropdown-menu`;

  return (
    <div role="menu" tabIndex="-1" aria-label={menuName} className={classNames} onBlur={onBlur} onKeyDown={onKeyDown}>
      <button
        onClick={onClick}
        className={`${buttonClasses} smart-hub--dropdown-menu-toggle-btn display-flex`}
        aria-label={buttonAriaLabel}
        type="button"
        disabled={disabled}
      >
        <span>{buttonText}</span>
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      <div className="smart-hub--dropdown-menu--contents" hidden={!menuIsOpen || disabled}>
        {children}
        { !hideApply && (
        <button
          type="button"
          className="usa-button smart-hub--button margin-2"
          onClick={onApplyClick}
          aria-label={applyButtonAria}
        >
          {applyButtonText}
        </button>
        ) }
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
  hideApply: PropTypes.bool,
  applyButtonText: PropTypes.string,
  applyButtonAria: PropTypes.string,
  onApply: PropTypes.func,
  className: PropTypes.string,
  menuName: PropTypes.string.isRequired,
  menuState: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.func,
    ])),
    PropTypes.bool,
  ]),
};

DropdownMenu.defaultProps = {
  hideApply: false,
  onApply: () => {},
  className: 'position-relative margin-left-1',
  buttonAriaLabel: '',
  disabled: false,
  styleAsSelect: false,
  blurValidations: () => true,
  applyButtonAria: 'Apply',
  applyButtonText: 'Apply',
  menuState: false,
};
