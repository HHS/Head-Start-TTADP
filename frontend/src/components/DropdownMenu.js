import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import './DropdownMenu.css';
import triangleDown from '../images/triange_down.png';

export default function DropdownMenu({
  buttonText,
  buttonAriaLabel,
  styleAsSelect,
  canBlur,
  children,
  disabled,
  applyButtonText,
  applyButtonAria,
  onApply,
  className,
  menuName,
  onCancel,
  showCancel,
  cancelAriaLabel,
  forwardedRef,
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const menuContents = useRef();

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
    if (e.relatedTarget && menuContents.current.contains(e.relatedTarget)) {
      return;
    }

    if (canBlur(e)) {
      setMenuIsOpen(false);
    }
  };

  const onClick = () => {
    setMenuIsOpen(!menuIsOpen);
  };

  const onApplyClick = () => {
    if (onApply()) {
      setMenuIsOpen(false);
    }
  };

  const onCancelClick = () => {
    onCancel();
    setMenuIsOpen(false);
  };

  const buttonClasses = styleAsSelect ? 'usa-select' : 'usa-button';

  // needs position relative for the menu to work properly
  const classNames = `${className} smart-hub--dropdown-menu position-relative`;

  // just to make things a little less verbose below
  function ApplyButton() {
    return (
      <button
        type="button"
        className="usa-button smart-hub--button margin-2"
        onClick={onApplyClick}
        aria-label={applyButtonAria}
      >
        {applyButtonText}
      </button>
    );
  }
  return (
    <div role="menu" ref={forwardedRef} tabIndex="-1" aria-label={menuName} className={classNames} onBlur={onBlur} onKeyDown={onKeyDown}>
      <button
        onClick={onClick}
        className={`${buttonClasses} smart-hub--dropdown-menu-toggle-btn display-flex margin-0 no-print`}
        aria-label={buttonAriaLabel}
        type="button"
        disabled={disabled}
      >
        <span>{buttonText}</span>
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      <div className="smart-hub--dropdown-menu--contents no-print" ref={menuContents} hidden={!menuIsOpen || disabled}>
        {children}
        { showCancel
          ? (
            <div className="margin-top-1 desktop:display-flex flex-justify-end margin-right-3 padding-x-3 desktop:padding-x-0">
              <button
                onClick={onCancelClick}
                type="button"
                className="usa-button usa-button--unstyled margin-right-2"
                aria-label={cancelAriaLabel}
              >
                Cancel
              </button>
              <ApplyButton />
            </div>
          )
          : (
            <ApplyButton />
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
  canBlur: PropTypes.func,
  applyButtonText: PropTypes.string,
  applyButtonAria: PropTypes.string,
  onApply: PropTypes.func.isRequired,
  className: PropTypes.string,
  menuName: PropTypes.string.isRequired,
  showCancel: PropTypes.bool,
  onCancel: PropTypes.func,
  cancelAriaLabel: PropTypes.string,
  forwardedRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
};

DropdownMenu.defaultProps = {
  className: 'margin-left-1',
  buttonAriaLabel: '',
  disabled: false,
  styleAsSelect: false,
  canBlur: () => true,
  applyButtonAria: 'Apply',
  applyButtonText: 'Apply',
  showCancel: false,
  cancelAriaLabel: '',
  onCancel: () => {},
  forwardedRef: () => {},

};
