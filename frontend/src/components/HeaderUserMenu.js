import React, { useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import Avatar from './Avatar';
import DropdownMenu from './DropdownMenu';
import './HeaderUserMenu.scss';
import NavLink from './NavLink';
import UserContext from '../UserContext';
import isAdmin from '../permissions';
import colors from '../colors';
import { LOCAL_STORAGE_IMPERSONATION_KEY } from '../Constants';

function UserMenuNav({ items }) {
  return (
    <div>
      <ul className="user-menu-nav">
        {items.map(({ key, element }) => (
          <li key={key}>
            {element}
          </li>
        ))}
      </ul>
    </div>
  );
}

UserMenuNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.number,
    element: PropTypes.element,
  })).isRequired,
};

function HeaderUserMenu() {
  let hasImpersonationKey;
  try {
    hasImpersonationKey = window.localStorage.getItem(LOCAL_STORAGE_IMPERSONATION_KEY) !== null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Local storage may not be available: ', e);
  }

  const { user } = useContext(UserContext);
  const userIsAdmin = isAdmin(user);
  const [isImpersonating, setIsImpersonating] = useState(hasImpersonationKey);

  const menuItems = useMemo(() => [
    { key: 1, label: 'Account Management', to: '/account' },
    {
      key: 2,
      label: 'User guide',
      to: 'https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/',
      external: true,
    },
    {
      key: 3,
      label: 'Contact support',
      to: 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a',
      external: true,
    },
    { key: 4, space: true },
    {
      key: 5,
      label: 'Admin',
      to: '/admin',
      showIfAdmin: true,
    },
    { key: 6, divider: true, showIfAdmin: false },
    {
      key: 7,
      label: 'Log out',
      to: '/logout',
    },
  ].map(({
    key,
    label,
    to,
    external = false,
    divider = false,
    space = false,
    showIfAdmin = false,
    fn = null,
  }) => {
    if (showIfAdmin && !userIsAdmin) return false;
    if (divider) return { key, element: <hr /> };
    if (space) return { key, element: <div className="height-6" /> };
    if (external) {
      return {
        key,
        element: (
          <Link key={key} className="usa-nav__link" href={to} target="_blank" rel="noopener noreferrer">
            {label}
            <FontAwesomeIcon className="margin-left-2" color={colors.ttahubMediumBlue} icon={faUpRightFromSquare} />
          </Link>
        ),
      };
    }
    return { key, element: <NavLink key={key} to={to} fn={fn}>{label}</NavLink> };
  }).filter(Boolean), [userIsAdmin]);

  /** If we don't have a user context, don't show the user menu. */
  if (!user) {
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
      alt={buttonAriaLabel}
      type="button"
      data-testid="header-avatar"
      className="unstyled-btn display-flex flex-align-center flex-justify-center"
      onClick={onClick}
      ref={clickOutsideRef}
    >
      <Avatar name={user.name} />
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

  const stopImpersonating = () => {
    window.localStorage.removeItem(LOCAL_STORAGE_IMPERSONATION_KEY);
    setIsImpersonating(false);
    window.location.href = '/';
  };

  return (
    <DropdownMenu
      Trigger={Av}
      onApply={() => {}}
      buttonText={user.name}
      showApplyButton={false}
      direction="left"
      className="no-print"
    >
      <div className="user-menu-dropdown" data-testid="user-menu-dropdown">
        <h4 className="margin-0 display-flex flex-align-center padding-2 border-bottom border-gray-10">
          <Avatar name={user.name} />
          <span className="margin-left-2">
            {user.name}
          </span>
        </h4>
        {isImpersonating && (
          <div className="display-flex flex-justify-center margin-top-2">
            <Button type="button" onClick={stopImpersonating}>
              Stop impersonating
            </Button>
          </div>
        )}
        <UserMenuNav items={menuItems} />
      </div>
    </DropdownMenu>
  );
}

export default HeaderUserMenu;
