/*
  Context menu shows a list of actions the user can select to perform actions. The actions
  are hidden until the user opens the menu (the three dot icon). The menu is automatically
  closed on blur. Pass this component an array of objects with the label and action to tie
  to that label. Be sure to pass in a description of the menu in the `label` prop. This prop
  is used as ellipsis' aria-label.
*/
import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import './Menu.scss';

const ESCAPE_KEY_CODE = 27;

function Menu({
  label,
  menuItems,
  backgroundColor,
  buttonTestId,
  buttonText,
  className,
  left,
  up,
  menuWidthOffset,
  menuHeightOffset,
  fixed,
}) {
  const [shown, updateShown] = useState(false);
  const [menuPosition, updateMenuPosition] = useState({});
  const defaultClass = 'smart-hub--menu';
  const buttonRef = useRef(null);

  const onEscape = useCallback((event) => {
    if (event.keyCode === ESCAPE_KEY_CODE) {
      updateShown(false);
    }
  }, [updateShown]);

  useEffect(() => {
    document.addEventListener('keydown', onEscape, false);
    return () => {
      document.removeEventListener('keydown', onEscape, false);
      updateShown(false);
    };
  }, [onEscape]);

  const recordButtonPositionAndUpdateMenu = useCallback(() => {
    // set initial postition
    if (fixed && buttonRef.current && buttonRef.current.getBoundingClientRect) {
      // get the button's position
      const {
        top,
        height,
        left: l,
        width,
      } = buttonRef.current.getBoundingClientRect();

      // we could be programmatically calculating the height and width offset numbers
      // but a little manual work up front will save on performance in the browser

      let leftPos = l + width;

      // left = the menu opens to the left of the button instead of the right
      if (left) {
        leftPos = l + width - menuWidthOffset;
      }

      // top = the menu opens above the button instead of below
      let topPos = top + height;

      if (up) {
        topPos = top - height - menuHeightOffset;
      }

      // update the CSS
      updateMenuPosition({ top: `${topPos}px`, left: `${leftPos}px` });
    }
  }, [fixed, left, menuHeightOffset, menuWidthOffset, up]);

  // watch for window scroll
  useEffect(() => {
    // the menu position is based on the button position, but because it is encased in a
    // no-overflow div, we position it using "fixed"
    // this means that it wouldn't scroll with the page, so we need to update the position
    // when the user scrolls
    if (fixed) {
      window.addEventListener('scroll', recordButtonPositionAndUpdateMenu);
    }

    return () => {
      window.removeEventListener('scroll', recordButtonPositionAndUpdateMenu);
    };
  }, [fixed, recordButtonPositionAndUpdateMenu]);

  const onBlur = (e) => {
    const { currentTarget } = e;

    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement) && shown) {
        updateShown(false);
      }
    }, 0);
  };

  const placementClass = (() => {
    if (left && up) return 'smart-hub--menu__left_and_up';
    if (left) return 'smart-hub--menu__left';
    if (up) return 'smart-hub--menu__up';
    return 'smart-hub--menu__right';
  })();

  const positionClass = fixed ? 'position-fixed' : 'position-absolute';
  const menuClass = `${defaultClass} shadow-1 z-top ${positionClass} ${placementClass}`;

  const onClick = () => {
    // we don't need to check anything before calling this - if fixed is false, it won't do anything
    recordButtonPositionAndUpdateMenu();

    // toggle the menu visibility
    updateShown((previous) => !previous);
  };

  return (
    <div
      onBlur={onBlur}
      className="position-relative"
    >
      <button
        className={`smart-hub--menu-button usa-button usa-button--unstyled smart-hub--button__no-margin ${className}`}
        aria-haspopup
        onClick={onClick}
        aria-label={label}
        type="button"
        data-testid={buttonTestId}
        ref={buttonRef}
      >
        {buttonText}
      </button>
      {shown && (
      <div data-testid="menu" className={menuClass} style={{ backgroundColor, ...menuPosition }}>
        <ul className="usa-list usa-list--unstyled" role="menu">
          {menuItems.map((item) => (
            <li key={item.label} role="menuitem">
              <Button type="button" id={item.id || undefined} onClick={() => { updateShown(false); item.onClick(); }} unstyled className="smart-hub--menu-button smart-hub--button__no-margin" aria-label={item.label}>
                <div className="padding-2 padding-right-3">
                  {item.label}
                </div>
              </Button>
            </li>
          ))}
        </ul>
      </div>
      )}
    </div>
  );
}

Menu.propTypes = {
  label: PropTypes.string.isRequired,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
    onClick: PropTypes.func,
    id: PropTypes.string,
  })).isRequired,
  backgroundColor: PropTypes.string,
  buttonTestId: PropTypes.string,
  left: PropTypes.bool,
  up: PropTypes.bool,
  menuWidthOffset: PropTypes.number,
  menuHeightOffset: PropTypes.number,
  buttonText: PropTypes.oneOfType([PropTypes.node, PropTypes.string]).isRequired,
  className: PropTypes.string,
  fixed: PropTypes.bool,
};

Menu.defaultProps = {
  backgroundColor: 'white',
  buttonTestId: 'ttahub-menu-button',
  className: '',
  left: true,
  up: false,
  menuWidthOffset: 120,
  menuHeightOffset: 140,
  fixed: false,
};

export default Menu;
