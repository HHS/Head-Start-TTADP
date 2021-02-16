/* eslint-disable react/no-array-index-key, react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { NavLink as Link } from 'react-router-dom';

import UserContext from '../UserContext';

const featuredLinkClasses = 'display-block border-left-05 border-white text-white text-bold text-no-underline text-center padding-x-3 padding-y-2 margin-y-2';

const navLinkClasses = 'display-block padding-left-3 padding-y-1 margin-y-1 text-base-light text-no-underline';

const NavLink = (props) => (<Link className={navLinkClasses} {...props} />);

const navItems = [
  <NavLink exact to="/">
    Logout
  </NavLink>,
  <NavLink to="/activity-reports">
    Settings
  </NavLink>,
];

const adminNavItem = [
  <NavLink to="/admin/:userId?">
    Admin
  </NavLink>,
];

const SiteNav = ({ admin }) => {
  const items = admin ? navItems.concat(adminNavItem) : navItems;

  return (
    <UserContext.Consumer>
      {({ user, authenticated }) => (
        <div className="smart-hub-sitenav text-white smart-hub-bg-blue height-full minh-tablet no-print">
          <div className="padding-2 margin-bottom-2">
            <p className="text-bold margin-y-105">{ user.name }</p>
            <p className="font-sans-3xs margin-y-105">{ user.email }</p>
          </div>
          <nav className="width-full margin-bottom-2">
            <ul className="add-list-reset">
              <Link className={featuredLinkClasses} to="/activity-reports">Activity Reports</Link>
            </ul>
          </nav>
          <div className="width-full pin-bottom padding-bottom-6 text-base-lighter border-top smart-hub-border-darkblue">
            {authenticated && (
              <ul className="add-list-reset">
                {items.map((item, i) => (<li key={`smart-hub-nav__item-${i}`}>{item}</li>))}
              </ul>
            )}
          </div>
        </div>
      )}
    </UserContext.Consumer>
  );
};
SiteNav.displayName = 'SiteNav';

SiteNav.propTypes = {
  admin: PropTypes.bool,
};

SiteNav.defaultProps = {
  admin: false,
};


export default SiteNav;
