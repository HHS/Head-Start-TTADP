/*
  Context menu shows a list of actions the user can select to perform actions. The actions
  are hidden until the user opens the menu (the three dot icon). The menu is automatically
  closed on blur. Pass this component an array of objects with the label and action to tie
  to that label. Be sure to pass in a description of the menu in the `label` prop. This prop
  is used as ellipsis' aria-label.
*/
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@trussworks/react-uswds';

import './ContextMenu.css';

const ESCAPE_KEY_CODE = 27;

function ContextMenu({
  label, menuItems, backgroundColor, left,
}) {
  const [shown, updateShown] = useState(false);
  const defaultClass = 'smart-hub--context-menu';
  const menuClass = left ? `${defaultClass} smart-hub--context-menu__left` : defaultClass;

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

  return (
    <div
      onBlur={onBlur}
      className="position-relative"
    >
      <Button
        className="smart-hub--context-menu-button smart-hub--button__no-margin"
        unstyled
        aria-haspopup
        onClick={() => { updateShown((previous) => !previous); }}
        aria-label={label}
        type="button"
        data-testid="ellipsis-button"
      >
        <FontAwesomeIcon color="black" icon={faEllipsisH} />
      </Button>
      {shown
    && (
    <div data-testid="menu" className={menuClass} style={{ backgroundColor }}>
      <ul className="usa-list usa-list--unstyled" role="menu">
        {menuItems.map((item) => (
          <li key={item.label} role="menuitem">
            <Button type="button" onClick={() => { updateShown(false); item.onClick(); }} unstyled className="smart-hub--context-menu-button smart-hub--button__no-margin">
              <div className="smart-hub--context-menu-item-label">
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

ContextMenu.propTypes = {
  label: PropTypes.string.isRequired,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
  })).isRequired,
  backgroundColor: PropTypes.string,
  left: PropTypes.bool,
};

ContextMenu.defaultProps = {
  backgroundColor: 'white',
  left: true,
};

export default ContextMenu;
