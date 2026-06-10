import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Link } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Avatar from './Avatar';
import AvatarGroup from './AvatarGroup';
import DropdownMenu from './DropdownMenu';
import './HeaderUserMenu.scss';
import { SESSION_STORAGE_IMPERSONATION_KEY, SUPPORT_LINK } from '../Constants';
import colors from '../colors';
import { storageAvailable } from '../hooks/helpers';
import isAdmin, { canSeeBehindFeatureFlag } from '../permissions';
import UserContext from '../UserContext';
import NavLink from './NavLink';
import Pill from './Pill';

function UserMenuNav({ items }) {
  return (
    <div>
      <ul className="user-menu-nav">
        {items.map(({ key, element, liClass, presentation }) => (
          <li key={key} className={liClass} role={presentation ? 'presentation' : 'listitem'}>
            {element}
          </li>
        ))}
      </ul>
    </div>
  );
}

UserMenuNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.number,
      element: PropTypes.element,
      presentation: PropTypes.bool,
    })
  ).isRequired,
};

function HeaderUserMenu({
  areThereUnreadWhatsNewNotifications,
  setAreThereUnreadWhatsNewNotifications,
}) {
  const haveStorage = useMemo(() => storageAvailable('sessionStorage'), []);
  const { user } = useContext(UserContext);
  const userIsAdmin = useMemo(() => isAdmin(user), [user]);
  const [isImpersonating, setIsImpersonating] = useState(
    haveStorage && window.sessionStorage.getItem(SESSION_STORAGE_IMPERSONATION_KEY) !== null
  );

  const onItemClick = useCallback(() => {
    document.querySelector('body').dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
  }, []);

  const location = useLocation();

  const menuItems = useMemo(
    () =>
      [
        { key: 1, label: 'Account Management', to: '/account' },
        {
          key: 2,
          label: 'Notifications',
          to: `/notifications`,
          featureFlag: 'actionable_notifications',
        },
        {
          key: 3,
          label: "What's new",
          to: `/whats-new?referrer=${encodeURIComponent(location.pathname)}`,
          badge: areThereUnreadWhatsNewNotifications ? (
            <Pill type="success" className="margin-left-1">
              new
            </Pill>
          ) : null,
          fn: () => {
            setAreThereUnreadWhatsNewNotifications(false);
            onItemClick();
          },
        },
        {
          key: 4,
          label: 'User guide',
          to: 'https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/',
          external: true,
        },
        {
          key: 5,
          label: 'Contact support',
          to: SUPPORT_LINK,
          external: true,
        },
        { key: 6, space: true },
        {
          key: 7,
          label: 'Admin',
          to: '/admin',
          showIfAdmin: true,
        },
        { key: 8, divider: true, showIfAdmin: false },
        {
          key: 9,
          label: 'Log out',
          href: '/api/logout-oidc',
        },
      ]
        .map(
          ({
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
            featureFlag = null,
          }) => {
            if (showIfAdmin && !userIsAdmin) return false;
            if (divider) return { key, presentation: true, element: <hr /> };
            if (space)
              return {
                key,
                presentation: true,
                element: <div aria-hidden="true" className="height-6" />,
              };

            if (external) {
              return {
                key,
                presentation: false,
                element: (
                  <Link
                    key={key}
                    className="usa-nav__link"
                    href={to}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{label}</span>
                    <FontAwesomeIcon
                      className="margin-left-2"
                      color={colors.ttahubMediumBlue}
                      icon={faUpRightFromSquare}
                    />
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
                    rel="noopener noreferrer"
                  >
                    <span>{label}</span>
                    {badge}
                  </a>
                ),
              };
            }
            if (featureFlag) {
              if (!canSeeBehindFeatureFlag(user, featureFlag)) {
                return false;
              }

              return {
                key,
                presentation: false,
                element: (
                  <NavLink key={key} to={to} fn={fn}>
                    <span>{label}</span>
                    {badge}
                  </NavLink>
                ),
              };
            }
            return {
              key,
              presentation: false,
              element: (
                <NavLink key={key} to={to} fn={fn}>
                  <span>{label}</span>
                  {badge}
                </NavLink>
              ),
            };
          }
        )
        .filter(Boolean),
    [
      areThereUnreadWhatsNewNotifications,
      location.pathname,
      setAreThereUnreadWhatsNewNotifications,
      userIsAdmin,
      onItemClick,
      user,
    ]
  );

  /** If we don't have a user context, don't show the user menu. */
  if (!user) {
    return null;
  }

  // A throw-away component that exists solely to wrap the avatar in a button.
  // This button is passed to DropdownMenu as the trigger to show the user menu.
  const Av = ({ onClick, disabled, clickOutsideRef }) => (
    <button
      disabled={disabled}
      aria-label={
        areThereUnreadWhatsNewNotifications
          ? 'You have unread notifications. Show user menu'
          : 'Show user menu'
      }
      type="button"
      data-testid="header-avatar"
      className={`unstyled-btn display-flex flex-align-center flex-justify-center position-relative ${areThereUnreadWhatsNewNotifications ? 'header-avatar-button__with-unread' : ''}`}
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
  areThereUnreadWhatsNewNotifications: PropTypes.bool,
  setAreThereUnreadWhatsNewNotifications: PropTypes.func.isRequired,
};

HeaderUserMenu.defaultProps = {
  areThereUnreadWhatsNewNotifications: false,
};

export default HeaderUserMenu;
