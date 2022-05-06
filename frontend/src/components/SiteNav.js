/* eslint-disable react/no-array-index-key, react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { NavLink as Link, withRouter } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartColumn, faBorderAll, faUserFriends } from '@fortawesome/free-solid-svg-icons';
import './SiteNav.scss';

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
    <button type="button" onClick={() => logout(false)} className={`usa-button--unstyled usa-button--unstyled_logout width-full ${navLinkClasses}`}>
      Logout
    </button>,
  ];

  const adminNavItem = [
    <NavLink to="/admin/">
      Admin
    </NavLink>,
  ];

  const [showActivityReportSurveyButton, setShowActivityReportSurveyButton] = useState(false);

  useEffect(() => {
    if (location.pathname === '/activity-reports' && authenticated) {
      setShowActivityReportSurveyButton(true);
    } else {
      setShowActivityReportSurveyButton(false);
    }
  }, [location.pathname, authenticated]);

  const items = admin ? navItems.concat(adminNavItem) : navItems;

  return (
    <div>
      <div className="position-relative z-top">
        <button id="tp-ar-landing-survey" className={`usa-button position-fixed bottom-2 right-1 display-${showActivityReportSurveyButton ? 'block' : 'none'}`} aria-label="Please leave feedback" type="button">Please leave feedback</button>
      </div>
      <div className="smart-hub-sitenav display-flex flex-column pin-y position-fixed z-0 padding-top-9 font-ui text-white smart-hub-bg-blue width-15 tablet:width-card desktop:width-card-lg no-print">
        {authenticated && (
          <div className="smart-hub-sitenav-content-container display-flex flex-column flex-1 overflow-y-scroll">
            <div className="width-full smart-hub-sitenav-separator--after">
              <div role="complementary" className="padding-2 smart-hub-sitenav-word-wrap--break">
                <p className="text-bold margin-top-2 desktop:margin-top-5">{user.name}</p>
                <p className="font-sans-3xs margin-bottom-2 desktop:margin-bottom-5">{user.email}</p>
              </div>
            </div>
            <nav className="display-flex flex-column flex-justify flex-1">
              <div className="width-full margin-bottom-2 margin-top-2 desktop:margin-top-6">
                <ul className="add-list-reset">
                  <li>
                    <NavLink
                      to="/activity-reports"
                    >
                      <span className="display-none tablet:display-inline padding-right-105">
                        <FontAwesomeIcon color="white" icon={faChartColumn} />
                      </span>
                      Activity Reports
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/regional-dashboard"
                    >
                      <span className="display-none tablet:display-inline padding-right-105">
                        <FontAwesomeIcon color="white" icon={faBorderAll} />
                      </span>
                      Regional Dashboard
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/recipient-tta-records"
                    >
                      <span className="display-none tablet:display-inline padding-right-105">
                        <FontAwesomeIcon color="white" icon={faUserFriends} />
                      </span>
                      Recipient TTA Records
                    </NavLink>
                  </li>
                </ul>
              </div>
              <div className="width-full padding-bottom-5 smart-hub-sitenav-separator--before opacity-70">
                <ul className="add-list-reset padding-top-5 text-base-lightest">
                  {items.map((item, i) => (<li key={`smart-hub-nav__item-${i}`}>{item}</li>))}
                </ul>
              </div>
            </nav>
          </div>
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
  logout: () => { },
  user: {
    name: '',
    email: '',
  },
};
export default withRouter(SiteNav);
