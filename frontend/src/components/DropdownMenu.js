import React, { useEffect, useState, useRef } from 'react';
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
  onCancel,
  showCancel,
  cancelAriaLabel,
  forwardedRef,
  alternateActionButton,
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const menuContents = useRef();

  useEffect(() => {
    // we're mixing the real stuff in
    window.addEventListener('keydown', (e) => {
      // if the content div's parent element (the whole menu)
      // has an element in focus
      if (!menuContents.current || !menuContents.current.parentElement.querySelector(':focus')) {
        return;
      }

      // we also have to check to see if we're inside a select box
      if (document.querySelector(':focus') && document.querySelector(':focus').classList.contains('usa-select')) {
        return;
      }

      // then we listen for the escape key
      // this is because we don't want to have to pass
      // a bunch of refs and the "setMenuIsOpen" thing down the tree
      // (I suppose this could be refactored to Consumer->Provider context, but why?)
      if (e.key === 'Escape') {
        setMenuIsOpen(false);
      }
    });
  }, []);

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
    onApply();
    setMenuIsOpen(false);
  };

  const onCancelClick = () => {
    onCancel();
    setMenuIsOpen(false);
  };

  const buttonClasses = styleAsSelect ? 'usa-select' : 'usa-button';

  // needs position relative for the menu to work properly
  const classNames = `${className} smart-hub--dropdown-menu position-relative`;

  const bottomRowFlexJustify = alternateActionButton ? 'flex-justify' : 'flex-justify-end';

  // just to make things a little less verbose below
  function ApplyButton() {
    return (
      <button
        type="button"
        className="usa-button smart-hub--button"
        onClick={onApplyClick}
        aria-label={applyButtonAria}
      >
        {applyButtonText}
      </button>
    );
  }
  return (
    <div ref={forwardedRef} className={classNames}>
      <button
        onClick={onClick}
        className={`${buttonClasses} smart-hub--dropdown-menu-toggle-btn display-flex margin-0`}
        aria-label={buttonAriaLabel}
        type="button"
        disabled={disabled}
        aria-pressed={menuIsOpen}
        onBlur={onBlur}
      >
        <span>{buttonText}</span>
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      <div className="smart-hub--dropdown-menu--contents" ref={menuContents} hidden={!menuIsOpen || disabled}>
        {children}
        { showCancel
          ? (
            <div className={`margin-top-1 desktop:display-flex ${bottomRowFlexJustify} margin-y-2 margin-x-3 padding-x-3 desktop:padding-x-0`}>
              {alternateActionButton}
              <div>
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
            </div>
          )
          : (
            <div className="margin-2 display-flex flex-justify">
              {alternateActionButton}
              <ApplyButton />
            </div>
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
  showCancel: PropTypes.bool,
  onCancel: PropTypes.func,
  cancelAriaLabel: PropTypes.string,
  forwardedRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
  alternateActionButton: PropTypes.node,
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
  alternateActionButton: null,
};
