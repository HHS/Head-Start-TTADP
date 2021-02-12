/* eslint-disable react/no-array-index-key */

import React from 'react';
// import PropTypes from 'prop-types';
import { NavLink as Link } from 'react-router-dom';

const featuredLinkClasses = 'display-block border-left-05 border-white text-white text-bold text-no-underline padding-y-2 padding-left-2 margin-y-2';

const navLinkClasses = 'display-block padding-left-2 padding-y-1 margin-y-1 text-base-light text-no-underline';

const navItems = [
  <Link className={navLinkClasses} exact to="/">Home</Link>,
  <Link className={navLinkClasses} to="foo">Logout</Link>,
  <Link className={navLinkClasses} to="foo">Settings</Link>,
];

const SiteNav = () => (
  <div className="smart-hub-sitenav text-white smart-hub-bg-blue height-full minh-tablet no-print">
    <div className="padding-2 margin-bottom-2">
      <p className="text-bold margin-y-105">Person Name</p>
      <p className="font-sans-2xs margin-y-105">email@user.gov</p>
    </div>
    <nav className="width-full margin-bottom-2">
      <ul className="add-list-reset">
        <Link className={featuredLinkClasses} to="/activity-reports">Activity Reports</Link>
      </ul>
    </nav>
    <div className="width-full pin-bottom padding-bottom-6 text-base-lighter border-top smart-hub-border-darkblue">
      <ul className="add-list-reset">
        {navItems.map((item, i) => (<li key={`smart-hub-nav__item-${i}`}>{item}</li>))}
      </ul>
    </div>
  </div>
);
SiteNav.displayName = 'SiteNav';

export default SiteNav;
