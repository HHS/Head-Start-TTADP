import React, {
  useState, useRef, createContext, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import './DropdownMenu.css';
import triangleDown from '../images/triange_down.png';

export const DropdownMenuContext = createContext({
  toggleMenu: () => {},
  onKeyDown: () => {},
});

/**
 *
 * It's a pretty complicated looking component but right now
 * the only required props are:
 *
 * onApply - The function that is called when the apply button is pressed
 * children - The contents of the dropdown window pane
 * buttonText - The text for the main toggle button (for example, "Filters")
 *
 * @param {React Props} props
 * @returns rendered JSX Object
 */
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
  AlternateActionButton,
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const menuContents = useRef();

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

  const onKeyDown = (e) => {
    console.log(e.currentTarget);
  };

  const buttonClasses = styleAsSelect ? 'usa-select' : 'usa-button';

  // needs position relative for the menu to work properly
  const classNames = `${className} smart-hub--dropdown-menu position-relative`;

  // just to make things a little less verbose below
  function ApplyButton() {
    return (
      <button
        type="button"
        className="usa-button smart-hub--button"
        onClick={onApplyClick}
        aria-label={applyButtonAria}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      >
        {applyButtonText}
      </button>
    );
  }

  // this should never change, so we want to store it here to
  // not rerender the children should this component re-render
  // (based on stuff I've read, anyways, it may be overkill)
  const contextValue = useMemo(() => ({
    onKeyDown,
    toggleMenu: setMenuIsOpen,
  }), []);

  return (
    <div ref={forwardedRef} className={classNames}>
      <button
        onClick={onClick}
        className={`${buttonClasses} smart-hub--dropdown-menu-toggle-btn display-flex margin-0 no-print`}
        aria-label={buttonAriaLabel}
        type="button"
        disabled={disabled}
        aria-pressed={menuIsOpen}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      >
        <span>{buttonText}</span>
        {!styleAsSelect && <img src={triangleDown} alt="" aria-hidden="true" /> }
      </button>

      <div className="smart-hub--dropdown-menu--contents no-print" ref={menuContents} hidden={!menuIsOpen || disabled}>
        <DropdownMenuContext.Provider value={contextValue}>
          {children}
        </DropdownMenuContext.Provider>
        { showCancel
          ? (
            <div className="margin-top-1 desktop:display-flex flex-justify margin-y-2 margin-x-3 padding-x-3 desktop:padding-x-0">
              {AlternateActionButton}
              <div>
                <button
                  onClick={onCancelClick}
                  type="button"
                  className="usa-button usa-button--unstyled margin-right-2"
                  aria-label={cancelAriaLabel}
                  onKeyDown={onKeyDown}
                >
                  Cancel
                </button>
                <ApplyButton />
              </div>
            </div>
          )
          : (
            <div className="margin-2 display-flex flex-justify">
              {AlternateActionButton}
              <ApplyButton />
            </div>
          ) }
      </div>
    </div>
  );
}

DropdownMenu.propTypes = {
  // the only required props are
  onApply: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  buttonText: PropTypes.string.isRequired,

  // these are all extra configuration
  buttonAriaLabel: PropTypes.string,
  disabled: PropTypes.bool,
  styleAsSelect: PropTypes.bool,
  canBlur: PropTypes.func,
  applyButtonText: PropTypes.string,
  applyButtonAria: PropTypes.string,
  className: PropTypes.string,
  showCancel: PropTypes.bool,
  onCancel: PropTypes.func,
  cancelAriaLabel: PropTypes.string,
  forwardedRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
  AlternateActionButton: PropTypes.node,
};

function DefaultAlternateActionButton() {
  return <span />;
}

DropdownMenu.defaultProps = {
  className: 'margin-left-1',
  buttonAriaLabel: '',
  disabled: false,
  styleAsSelect: false,
  canBlur: () => true,
  applyButtonAria: 'Apply',
  applyButtonText: 'Apply',
  showCancel: false,
  cancelAriaLabel: 'Cancel',
  onCancel: () => {},
  forwardedRef: () => {},
  AlternateActionButton: DefaultAlternateActionButton,
};
