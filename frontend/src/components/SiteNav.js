/* eslint-disable react/no-array-index-key, react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { NavLink as Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';

const navLinkClasses = [
  'display-block',
  'padding-x-2',
  'padding-y-1',
  'margin-y-1',
  'font-ui-xs',
  'text-base-light',
  'text-base-light',
  'text-no-underline',
  'smart-hub-cursor-pointer',
  'hover:text-white',
  'hover:text-no-underline',
].join(' ');

const NavLink = (props) => (<Link className={navLinkClasses} {...props} />);

const SiteNav = ({
  admin,
  authenticated,
  logout,
  user,
}) => {
  const navItems = [
    <button type="button" onClick={logout} className={`usa-button--unstyled width-full ${navLinkClasses}`}>
      Logout
    </button>,
    <NavLink to="/activity-reports">
      Settings
    </NavLink>,
  ];

  const adminNavItem = [
    <NavLink to="/admin/">
      Admin
    </NavLink>,
  ];

  const items = admin ? navItems.concat(adminNavItem) : navItems;

  return (
    <div className="smart-hub-sitenav position-relative font-ui text-white smart-hub-bg-blue smart-hub-height-hd minh-tablet no-print">
      <div className="width-full">
        <div className="margin-x-2 border-bottom smart-hub-border-darkblue padding-y-2">
          <p className="text-bold margin-y-105">{ user.name }</p>
          <p className="font-sans-3xs margin-y-105">{ user.email }</p>
        </div>
      </div>
      <nav className="width-full margin-bottom-2">
        <ul className="add-list-reset">
          <li>
            <Link
              className="display-block border-left-05 border-white text-white text-bold text-no-underline padding-2 margin-y-2"
              to="/activity-reports"
            >
              <span className="padding-right-105">
                <FontAwesomeIcon color="white" icon={faChartBar} />
              </span>
              Activity Reports
            </Link>
          </li>
        </ul>
      </nav>
      <div className="width-full position-absolute bottom-0 padding-bottom-6">
        {authenticated && (
          <ul className="add-list-reset margin-x-2 padding-top-2 text-base-lighter border-top smart-hub-border-darkblue">
            {items.map((item, i) => (<li key={`smart-hub-nav__item-${i}`}>{item}</li>))}
          </ul>
        )}
      </div>
    </div>
  );
};
SiteNav.displayName = 'SiteNav';

SiteNav.propTypes = {
  admin: PropTypes.bool,
  authenticated: PropTypes.bool,
  logout: PropTypes.func.isRequired,
  user: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string }),
};

SiteNav.defaultProps = {
  admin: false,
  authenticated: false,
  user: {
    name: '',
    email: '',
  },
};

export default SiteNav;
