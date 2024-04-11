/* eslint-disable react/no-array-index-key, react/jsx-props-no-spreading */
import React, {
  useState, useContext, useEffect, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { NavLink as Link, withRouter } from 'react-router-dom';
import './SiteNav.scss';
import FeatureFlag from './FeatureFlag';
import UserContext from '../UserContext';
import { allRegionsUserHasPermissionTo } from '../permissions';

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
  authenticated,
  location,
  hasAlerts,
}) => {
  const { user } = useContext(UserContext);
  const siteNavContent = useRef(null);
  const [showActivityReportSurveyButton, setShowActivityReportSurveyButton] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (location.pathname === '/activity-reports' && authenticated) {
      setShowActivityReportSurveyButton(true);
    } else {
      setShowActivityReportSurveyButton(false);
    }

    setShowSidebar(!(location.pathname === '/logout'));
  }, [location.pathname, authenticated]);

  // This resizes the site nav content's gap to account for the header if there is an alert
  useEffect(() => {
    if (hasAlerts && siteNavContent.current) {
      const header = document.querySelector('.smart-hub-header.has-alerts');
      if (header) {
        siteNavContent.current.style.paddingTop = `${siteNavContent.current.style.paddingTop + header.offsetHeight}px`;
      }
    }
  }, [hasAlerts]);

  // Determine Default Region.
  const regions = allRegionsUserHasPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const hasMultipleRegions = regions && regions.length > 1;

  const regionDisplay = regions.join(', ');

  // If user has more than one region, Regions label is plural, else singular
  const regionLabel = () => {
    if (defaultRegion === 14) {
      return 'All Regions';
    }

    if (hasMultipleRegions) {
      return `Regions ${regionDisplay}`;
    }

    return `Region ${regionDisplay}`;
  };

  if (!showSidebar) return null;

  return (
    <div>
      <div className="position-relative z-top">
        <a
          href="https://touchpoints.app.cloud.gov/touchpoints/7d519b5e"
          className={`usa-button position-fixed bottom-2 right-1 display-${showActivityReportSurveyButton ? 'block' : 'none'}`}
          target="_blank"
          rel="noreferrer"
        >
          Please leave feedback
        </a>
      </div>
      <div ref={siteNavContent} className="smart-hub-sitenav display-flex flex-column pin-y position-fixed z-0 desktop:padding-top-9 padding-top-6 font-ui text-white smart-hub-bg-blue width-15 tablet:width-card desktop:width-card-lg no-print">
        {authenticated && (
          <div className="smart-hub-sitenav-content-container display-flex flex-column flex-1 overflow-y-scroll">
            <div className="width-full smart-hub-sitenav-separator--after">
              <div role="complementary" className="padding-2 smart-hub-sitenav-word-wrap--break">
                <p className="text-bold margin-top-2 desktop:margin-top-5 margin-bottom-1">{user.name}</p>
                <p className="font-sans-3xs margin-bottom-2 desktop:margin-bottom-5 margin-top-1">{regionLabel()}</p>
              </div>
            </div>
            <nav className="display-flex flex-column flex-justify flex-1" aria-label="main navigation">
              <div className="width-full margin-bottom-2 margin-top-2 desktop:margin-top-6">
                <ul className="add-list-reset">
                  <li>
                    <NavLink
                      to="/activity-reports"
                    >
                      Activity Reports
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/training-reports/not-started"
                    >
                      Training Reports
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/regional-dashboard"
                    >
                      Regional Dashboard
                    </NavLink>
                  </li>
                  <FeatureFlag flag="regional_goal_dashboard">
                    <li>
                      <NavLink
                        to="/regional-goal-dashboard"
                      >
                        Regional Goal Dashboard
                      </NavLink>
                    </li>
                  </FeatureFlag>
                  <FeatureFlag flag="resources_dashboard">
                    <li>
                      <NavLink
                        to="/dashboards/resources-dashboard"
                      >
                        Resources Dashboard
                      </NavLink>
                    </li>
                  </FeatureFlag>
                  <li>
                    <NavLink
                      to="/recipient-tta-records"
                    >
                      Recipient TTA Records
                    </NavLink>
                  </li>
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
  authenticated: PropTypes.bool,
  location: PropTypes.shape({ pathname: PropTypes.string }).isRequired,
  hasAlerts: PropTypes.bool.isRequired,
};

SiteNav.defaultProps = {
  authenticated: false,
};
export default withRouter(SiteNav);
