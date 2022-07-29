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
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import Menu from './Menu';

function ContextMenu({
  label, menuItems, backgroundColor, left, up,
}) {
  return (
    <Menu
      label={label}
      menuItems={menuItems}
      backgroundColor={backgroundColor}
      left={left}
      up={up}
      buttonText={<FontAwesomeIcon color={colors.textInk} icon={faEllipsisH} />}
      buttonTestId="ellipsis-button"
    />
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
  up: PropTypes.bool,
};

ContextMenu.defaultProps = {
  backgroundColor: 'white',
  left: true,
  up: false,
};

export default ContextMenu;
