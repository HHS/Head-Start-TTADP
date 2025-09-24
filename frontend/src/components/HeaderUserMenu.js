import React, { useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router-dom';
import Avatar from './Avatar';
import AvatarGroup from './AvatarGroup';
import DropdownMenu from './DropdownMenu';
import './HeaderUserMenu.scss';
import NavLink from './NavLink';
import UserContext from '../UserContext';
import isAdmin from '../permissions';
import colors from '../colors';
import Pill from './Pill';
import { SESSION_STORAGE_IMPERSONATION_KEY, SUPPORT_LINK } from '../Constants';
import { storageAvailable } from '../hooks/helpers';

function UserMenuNav({ items }) {
  return (
    <div>
      <ul className="user-menu-nav">
        {items.map(({
          key, element, liClass, presentation,
        }) => (
          <li key={key} className={liClass} role={presentation ? 'presentation' : 'listitem'}>
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
    presentation: PropTypes.bool,
  })).isRequired,
};

function HeaderUserMenu({ areThereUnreadNotifications, setAreThereUnreadNotifications }) {
  const haveStorage = useMemo(() => storageAvailable('sessionStorage'), []);
  const { user } = useContext(UserContext);
  const userIsAdmin = isAdmin(user);
  const [isImpersonating, setIsImpersonating] = useState(
    haveStorage && window.sessionStorage.getItem(SESSION_STORAGE_IMPERSONATION_KEY) !== null,
  );

  const onItemClick = () => {
    document.querySelector('body').dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
  };

  const location = useLocation();

  const menuItems = useMemo(() => [
    { key: 1, label: 'Account Management', to: '/account' },
    {
      key: 2,
      label: 'Notifications',
      to: `/notifications?referrer=${encodeURIComponent(location.pathname)}`,
      badge: areThereUnreadNotifications ? <Pill type="success" className="margin-left-1">new</Pill> : <></>,
      fn: () => {
        setAreThereUnreadNotifications(false);
        onItemClick();
      },
    },
    {
      key: 3,
      label: 'User guide',
      to: 'https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/',
      external: true,
    },
    {
      key: 4,
      label: 'Contact support',
      to: SUPPORT_LINK,
      external: true,
    },
    { key: 5, space: true },
    {
      key: 6,
      label: 'Admin',
      to: '/admin',
      showIfAdmin: true,
    },
    { key: 7, divider: true, showIfAdmin: false },
    {
      key: 8,
      label: 'Log out',
      href: '/api/logout-oidc',
    },
  ].map(({
    key,
    label,
    to,
    href,
    external = false,
    divider = false,
    space = false,
    showIfAdmin = false,
    badge = <></>,
    fn = onItemClick,
  }) => {
    if (showIfAdmin && !userIsAdmin) return false;
    if (divider) return { key, presentation: true, element: <hr /> };
    if (space) return { key, presentation: true, element: <div aria-hidden="true" className="height-6" /> };

    if (external) {
      return {
        key,
        presentation: false,
        element: (
          <Link key={key} className="usa-nav__link" href={to} target="_blank" rel="noopener noreferrer">
            <span>{label}</span>
            <FontAwesomeIcon className="margin-left-2" color={colors.ttahubMediumBlue} icon={faUpRightFromSquare} />
            {badge}
          </Link>
        ),
      };
    }
    if (href) {
      return {
        key,
        presentation: false,
        element: (
          <a
            key={key}
            className="usa-nav__link"
            href={href}
            onClick={fn}
          >
            <span>{label}</span>
            {badge}
          </a>
        ),
      };
    }
    return {
      key,
      presentation: false,
      element: (
        <>
          <NavLink key={key} to={to} fn={fn}>
            <span>{label}</span>
            {badge}
          </NavLink>
        </>
      ),
    };
  }).filter(Boolean), [
    areThereUnreadNotifications,
    location.pathname,
    setAreThereUnreadNotifications,
    userIsAdmin,
  ]);

  /** If we don't have a user context, don't show the user menu. */
  if (!user) {
    return <></>;
  }

  // A throw-away component that exists solely to wrap the avatar in a button.
  // This button is passed to DropdownMenu as the trigger to show the user menu.
  const Av = ({
    onClick,
    disabled,
    clickOutsideRef,
  }) => (
    <button
      disabled={disabled}
      aria-label={areThereUnreadNotifications ? 'You have unread notifications. Show user menu' : 'Show user menu'}
      type="button"
      data-testid="header-avatar"
      className={`unstyled-btn display-flex flex-align-center flex-justify-center position-relative ${areThereUnreadNotifications ? 'header-avatar-button__with-unread' : ''}`}
      onClick={onClick}
      ref={clickOutsideRef}
    >
      <Avatar name={user.name} />
    </button>
  );

  Av.propTypes = {
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    clickOutsideRef: PropTypes.oneOfType([
      PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
      PropTypes.func,
    ]),
  };

  Av.defaultProps = {
    onClick: () => {},
    disabled: false,
    clickOutsideRef: () => {},
  };

  const stopImpersonating = () => {
    setIsImpersonating(false);
    window.sessionStorage.removeItem(SESSION_STORAGE_IMPERSONATION_KEY);
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
        <AvatarGroup userName={user.name} />
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

HeaderUserMenu.propTypes = {
  areThereUnreadNotifications: PropTypes.bool,
  setAreThereUnreadNotifications: PropTypes.func.isRequired,
};

HeaderUserMenu.defaultProps = {
  areThereUnreadNotifications: false,
};

export default HeaderUserMenu;
