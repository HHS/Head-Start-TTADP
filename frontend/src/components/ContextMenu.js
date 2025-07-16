/*
  Context menu shows a list of actions the user can select to perform actions. The actions
  are hidden until the user opens the menu (the three dot icon). The menu is automatically
  closed on blur. Pass this component an array of objects with the label and action to tie
  to that label. Be sure to pass in a description of the menu in the `label` prop. This prop
  is used as ellipsis' aria-label.
*/
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import Menu from './Menu';

function ContextMenu({
  label,
  menuItems,
  backgroundColor,
  left,
  up,
  menuWidthOffset,
  menuHeightOffset,
  fixed,
}) {
  return (
    <Menu
      label={label}
      menuItems={menuItems}
      backgroundColor={backgroundColor}
      left={left}
      menuWidthOffset={menuWidthOffset}
      up={up}
      menuHeightOffset={menuHeightOffset}
      buttonText={(
        <>
          <span className="usa-button--unstyled">Actions</span>
          <span>&nbsp;</span>
          <FontAwesomeIcon color={colors.textLink} icon={faChevronDown} />
        </>
)}
      buttonTestId="context-menu-actions-btn"
      fixed={fixed}
    />
  );
}

ContextMenu.propTypes = {
  label: PropTypes.string.isRequired,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
    id: PropTypes.string,
  })).isRequired,
  backgroundColor: PropTypes.string,
  left: PropTypes.bool,
  up: PropTypes.bool,
  menuHeightOffset: PropTypes.number,
  menuWidthOffset: PropTypes.number,
  fixed: PropTypes.bool,
};

ContextMenu.defaultProps = {
  backgroundColor: 'white',
  left: false,
  up: false,
  menuHeightOffset: 120,
  menuWidthOffset: 135,
  fixed: false,
};

export default ContextMenu;
