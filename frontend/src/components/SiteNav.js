/* eslint-disable react/no-array-index-key, react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
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
  'border-left-05',
  'border-transparent',
  'text-base-lightest',
  'text-no-underline',
  'smart-hub-cursor-pointer',
  'hover:text-white',
  'hover:text-no-underline',
].join(' ');

const activeNavLinkClasses = 'border-left-05 border-white text-bold';

const NavLink = (props) => (
  <Link activeClassName={activeNavLinkClasses} className={navLinkClasses} {...props} />
);

const SiteNav = ({
  admin,
  authenticated,
  logout,
  user,
  location,
}) => {
  const navItems = [
    <button type="button" onClick={() => logout(false)} className={`usa-button--unstyled width-full ${navLinkClasses}`}>
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
    <div>

      <div className="smart-hub-sitenav pin-y position-fixed z-0 padding-top-9 font-ui text-white smart-hub-bg-blue width-15 tablet:width-card desktop:width-card-lg no-print">
        {authenticated && (
        <>
          <div className="width-full smart-hub-sitenav-separator--after">
            <div role="complementary" className="padding-2 smart-hub-sitenav-word-wrap--break">
              <p className="text-bold margin-top-5">{ user.name }</p>
              <p className="font-sans-3xs margin-bottom-5">{ user.email }</p>
            </div>
          </div>
          <nav>
            <div className="width-full margin-bottom-2 margin-top-6">
              <ul className="add-list-reset">
                <li>
                  <NavLink
                    to="/activity-reports"
                  >
                    <span className="padding-right-105">
                      <FontAwesomeIcon color="white" icon={faChartBar} />
                    </span>
                    Activity Reports
                  </NavLink>
                </li>
              </ul>
            </div>
            <div className="width-full position-absolute bottom-0 padding-bottom-5 smart-hub-sitenav-separator--before opacity-70">
              <ul className="add-list-reset padding-top-5 text-base-lightest">
                {items.map((item, i) => (<li key={`smart-hub-nav__item-${i}`}>{item}</li>))}
              </ul>
            </div>
          </nav>
        </>
        )}
      </div>
    </div>
  );
};
SiteNav.displayName = 'SiteNav';

SiteNav.propTypes = {
  admin: PropTypes.bool,
  authenticated: PropTypes.bool,
  logout: PropTypes.func,
  user: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string }),
  location: PropTypes.shape({ pathname: PropTypes.string }).isRequired,
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
