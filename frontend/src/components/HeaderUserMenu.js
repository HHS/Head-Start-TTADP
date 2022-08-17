import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { SideNav } from '@trussworks/react-uswds';
import Avatar from './Avatar';
import DropdownMenu from './DropdownMenu';
import './HeaderUserMenu.scss';
import NavLink from './NavLink';
import UserContext from '../UserContext';
import isAdmin from '../permissions';

function HeaderUserMenu({ name = '' }) {
  const { user, logout } = useContext(UserContext);
  const userIsAdmin = isAdmin(user);

  const menuItems = useMemo(() => [
    { label: 'Account', to: '/account' },
    { label: 'User Guide', to: '/guide' },
    { label: 'Contact Support', to: '/support' },
    { space: true },
    { label: 'Admin', to: '/admin', showIfAdmin: true },
    { divider: true, showIfAdmin: true },
    { label: 'Log out', to: '/logout', fn: () => logout(false) },
  ].map(({
    label,
    to,
    divider = false,
    space = false,
    showIfAdmin = false,
    fn = null,
  }) => {
    if (showIfAdmin && !userIsAdmin) return false;
    if (divider) return <hr />;
    if (space) return <div className="height-6" />;
    return <NavLink key={to} to={to} fn={fn}>{label}</NavLink>;
  }).filter(Boolean), [userIsAdmin, logout]);

  if (!user) {
    // return <Avatar name=" " />;
    return <></>;
  }

  // A throw-away component that exists solely to wrap the avatar in a button.
  // This button is passed to DropdownMenu as the trigger to show the user menu.
  const Av = ({
    onClick,
    disabled,
    buttonAriaLabel,
    clickOutsideRef,
  }) => (
    <button
      disabled={disabled}
      aria-label={buttonAriaLabel}
      type="button"
      className="unstyled-btn display-flex flex-align-center flex-justify-center"
      onClick={onClick}
      ref={clickOutsideRef}
    >
      <Avatar name={name} />
    </button>
  );

  Av.propTypes = {
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    buttonAriaLabel: PropTypes.string,
    clickOutsideRef: PropTypes.oneOfType([
      PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
      PropTypes.func,
    ]),
  };
  Av.defaultProps = {
    onClick: () => {},
    disabled: false,
    buttonAriaLabel: 'Show user menu',
    clickOutsideRef: () => {},
  };

  return (
    <DropdownMenu
      Trigger={Av}
      onApply={() => {}}
      buttonText={name}
      showApplyButton={false}
      direction="left"
      canBlur={() => false}
    >
      <div className="user-menu">
        <h4 className="margin-0 display-block padding-2 border-bottom border-gray-10">{name}</h4>
        <SideNav className="user-menu" items={menuItems} />
      </div>
    </DropdownMenu>
  );
}

HeaderUserMenu.propTypes = {
  name: PropTypes.string.isRequired,
};

export default HeaderUserMenu;
