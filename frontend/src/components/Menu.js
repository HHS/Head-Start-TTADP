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
    if (buttonRef.current) {
      if (buttonRef.current.getBoundingClientRect) {
      // get the button's position
        const {
          top,
          height,
          left: l,
          width,
        } = buttonRef.current.getBoundingClientRect();

        let leftPos = l + width;

        if (left) {
          leftPos = l + width - menuWidthOffset;
        }

        let topPos = top + height;

        if (up) {
          topPos = top - height - menuHeightOffset;
        }

        // update the CSS
        updateMenuPosition({ top: `${topPos}px`, left: `${leftPos}px` });
      }
    }
  }, [left, menuHeightOffset, menuWidthOffset, up]);

  // watch for window scroll
  useEffect(() => {
    window.addEventListener('scroll', recordButtonPositionAndUpdateMenu);

    return () => {
      window.removeEventListener('scroll', recordButtonPositionAndUpdateMenu);
    };
  }, [recordButtonPositionAndUpdateMenu]);

  const onBlur = (e) => {
    const { currentTarget } = e;

    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement) && shown) {
        updateShown(false);
      }
    }, 0);
  };

  // while these classes no longer trigger the application of any CSS rules,
  // I like the semantics of the class names, and they are useful in debugging and
  // automatied testing
  const placementClass = (() => {
    if (left && up) {
      return 'smart-hub--menu__left_and_up';
    }

    if (left) {
      return 'smart-hub--menu__left';
    }

    if (up) {
      return 'smart-hub--menu__up';
    }

    return '';
  })();

  const menuClass = `${defaultClass} shadow-1 z-top position-fixed ${placementClass}`;

  const onClick = () => {
    recordButtonPositionAndUpdateMenu();
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
              <Button type="button" onClick={() => { updateShown(false); item.onClick(); }} unstyled className="smart-hub--menu-button smart-hub--button__no-margin">
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
  })).isRequired,
  backgroundColor: PropTypes.string,
  buttonTestId: PropTypes.string,
  left: PropTypes.bool,
  up: PropTypes.bool,
  menuWidthOffset: PropTypes.number,
  menuHeightOffset: PropTypes.number,
  buttonText: PropTypes.oneOfType([PropTypes.node, PropTypes.string]).isRequired,
  className: PropTypes.string,
};

Menu.defaultProps = {
  backgroundColor: 'white',
  buttonTestId: 'ttahub-menu-button',
  className: '',
  left: true,
  up: false,
  menuWidthOffset: 120,
  menuHeightOffset: 140,
};

export default Menu;
