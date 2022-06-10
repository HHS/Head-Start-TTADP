/*
  Context menu shows a list of actions the user can select to perform actions. The actions
  are hidden until the user opens the menu (the three dot icon). The menu is automatically
  closed on blur. Pass this component an array of objects with the label and action to tie
  to that label. Be sure to pass in a description of the menu in the `label` prop. This prop
  is used as ellipsis' aria-label.
*/
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import './Menu.scss';

const ESCAPE_KEY_CODE = 27;

function Menu({
  label,
  menuItems,
  backgroundColor,
  left,
  up,
  buttonTestId,
  buttonText,
  className,
}) {
  const [shown, updateShown] = useState(false);
  const defaultClass = 'smart-hub--menu';

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

  const onBlur = (e) => {
    const { currentTarget } = e;

    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement) && shown) {
        updateShown(false);
      }
    }, 0);
  };

  const placementClass = () => {
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
  };

  const menuClass = `${defaultClass} shadow-1 ${placementClass()}`;

  const onClick = () => updateShown((previous) => !previous);

  return (
    <div
      onBlur={onBlur}
      className="position-relative"
    >
      <Button
        className={`smart-hub--menu-button smart-hub--button__no-margin ${className}`}
        unstyled
        aria-haspopup
        onClick={onClick}
        aria-label={label}
        type="button"
        data-testid={buttonTestId}
      >
        {buttonText}
      </Button>
      {shown
    && (
    <div data-testid="menu" className={menuClass} style={{ backgroundColor }}>
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
  left: PropTypes.bool,
  up: PropTypes.bool,
  buttonTestId: PropTypes.string,
  buttonText: PropTypes.oneOfType([PropTypes.node, PropTypes.string]).isRequired,
  className: PropTypes.string,
};

Menu.defaultProps = {
  backgroundColor: 'white',
  left: true,
  up: false,
  buttonTestId: 'ttahub-menu-button',
  className: '',
};

export default Menu;
