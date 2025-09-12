import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { showFilterWithMyRegions } from '../regionHelpers';

import UserContext from '../../UserContext';
import CollabReports from './components/CollabReports';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import useFilters from '../../hooks/useFilters';
import './index.scss';

const FILTER_KEY = 'collab-landing-filters';

export const CollabReportsLanding = () => {
  const { user } = useContext(UserContext);

  const {
    hasMultipleRegions,
    defaultRegion,
    // regions,
    allRegionsFilters,
    filters,
    setFilters,
  } = useFilters(
    user,
    FILTER_KEY,
    true,
    [],
    [], // update with FILTER_CONFIG once created
  );

  const regionLabel = `your region${(defaultRegion === 14 || hasMultipleRegions) ? 's' : ''}`;
  const inProgressCollabEmptyMsg = 'You have no Collaboration Reports in progress.';
  const approvedCollabEmptyMsg = 'You have no approved Collaboration Reports.';
  return (
    <div className="ttahub-dashboard">
      <Helmet>
        <title>Collaboration Reports</title>
      </Helmet>
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={
            () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
          }
      />
      <div className="collab-report-header margin-top-0 margin-bottom-3 flex-column flex-align-start display-flex">
        <h1 className="landing tablet:margin-right-2 margin-bottom-0">
          {`Collaboration reports - ${regionLabel}`}
        </h1>
        <div className="margin-top-1">
          <Link
            to="/collaboration-reports/new/activity-summary"
            className="usa-button smart-hub--new-report-btn"
          >
            <span className="smart-hub--plus">+</span>
            <span className="smart-hub--new-report">New Collaboration Report</span>
          </Link>
        </div>
      </div>
      {/* TODO: Wrap this in a FilterContext.Provider component when filters added */}
      <CollabReports title="Collaboration Report Alerts" showCreateMsgOnEmpty emptyMsg={inProgressCollabEmptyMsg} isAlerts />
      <CollabReports title="Approved Collaboration Reports" emptyMsg={approvedCollabEmptyMsg} />
    </div>
  );
};

export default CollabReportsLanding;
