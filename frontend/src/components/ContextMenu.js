/*
  Context menu shows a list of actions the user can select to perform actions. The actions
  are hidden until the user opens the menu (the three dot icon). The menu is automatically
  closed on blur. Pass this component an array of objects with the label and action to tie
  to that label. Be sure to pass in a description of the menu in the `label` prop. This prop
  is used as ellipsis' aria-label.
*/
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@trussworks/react-uswds';

import './ContextMenu.css';

function ContextMenu({
  label, menuItems, backgroundColor, left,
}) {
  const [shown, updateShown] = useState(false);
  const defaultClass = 'smart-hub--context-menu';
  const menuClass = left ? `${defaultClass} smart-hub--context-menu__left` : defaultClass;

  const onBlur = (e) => {
    const { currentTarget } = e;

    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement) && shown) {
        updateShown(false);
      }
    }, 0);
  };

  return (
    <div onBlur={onBlur}>
      <Button
        type="button"
        className="smart-hub--context-menu-button smart-hub--button__no-margin"
        unstyled
        onClick={() => updateShown((previous) => !previous)}
        aria-label={label}
      >
        <FontAwesomeIcon color="black" icon={faEllipsisH} />
      </Button>
      {shown
    && (
    <div className={menuClass} style={{ backgroundColor }}>
      {menuItems.map((item) => (
        <Button type="button" onClick={item.onClick} unstyled className="smart-hub--context-menu-button smart-hub--button__no-margin" key={item.label}>
          <div className="smart-hub--context-menu-item-label">
            {item.label}
          </div>
        </Button>
      ))}
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
