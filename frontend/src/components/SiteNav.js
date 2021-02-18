/* eslint-disable react/no-array-index-key, react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { NavLink as Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';

import './SiteNav.css';

const navLinkClasses = [
  'display-block',
  'padding-x-2',
  'padding-y-1',
  'margin-y-1',
  'font-ui-xs',
  'text-base-lightest',
  'text-no-underline',
  'smart-hub-cursor-pointer',
  'hover:text-white',
  'hover:text-no-underline',
].join(' ');

const activeNavLinkClasses = 'border-left-05 border-white';

const NavLink = (props) => (
  <Link activeClassName={activeNavLinkClasses} className={navLinkClasses} {...props} />
);

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
  ];

  const adminNavItem = [
    <NavLink to="/admin/">
      Admin
    </NavLink>,
  ];

  const items = admin ? navItems.concat(adminNavItem) : navItems;

  return (
    <div className="smart-hub-sitenav position-relative font-ui text-white smart-hub-bg-blue maxw-card-lg minw-15 smart-hub-height-hd minh-tablet no-print">
      {authenticated && (
        <>
          <div className="width-full smart-hub-sitenav-separator--after">
            <div role="complementary" className="padding-2 smart-hub-sitenav-word-wrap--break">
              <p className="text-bold margin-y-105">{ user.name }</p>
              <p className="font-sans-3xs margin-y-105">{ user.email }</p>
            </div>
          </div>
          <nav>
            <div className="width-full margin-bottom-2">
              <ul className="add-list-reset">
                <li>
                  <Link
                    activeClassName={activeNavLinkClasses}
                    className="display-block text-white text-bold text-no-underline padding-2 margin-y-2"
                    to="/activity-reports"
                  >
                    <span className="padding-right-105">
                      <FontAwesomeIcon color="white" icon={faChartBar} />
                    </span>
                    Activity Reports
                  </Link>
                </li>
              </ul>
            </div>
            <div className="width-full position-absolute bottom-0 padding-bottom-6 smart-hub-sitenav-separator--before">
              <ul className="add-list-reset padding-top-2 text-base-lightest">
                {items.map((item, i) => (<li key={`smart-hub-nav__item-${i}`}>{item}</li>))}
              </ul>
            </div>
          </nav>
        </>
      )}
    </div>
  );
};
SiteNav.displayName = 'SiteNav';

SiteNav.propTypes = {
  admin: PropTypes.bool,
  authenticated: PropTypes.bool,
  logout: PropTypes.func,
  user: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string }),
};

SiteNav.defaultProps = {
  admin: false,
  authenticated: false,
  logout: () => {},
  user: {
    name: '',
    email: '',
  },
};

export default SiteNav;
