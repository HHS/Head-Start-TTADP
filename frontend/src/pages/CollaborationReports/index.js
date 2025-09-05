import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { showFilterWithMyRegions } from '../regionHelpers';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import FilterPanel from '../../components/filter/FilterPanel';
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
    regions,
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
      <div className="collab-report-header flex-align-center margin-top-0 margin-bottom-3">
        <h1 className="landing">
          {`Collaboration reports - ${regionLabel}`}
        </h1>
        <div>
          <Link
            to="/collaboration-reports/new/activity-summary"
            className="usa-button smart-hub--new-report-btn"
          >
            <span className="smart-hub--plus">+</span>
            <span className="smart-hub--new-report">New Collaboration Report</span>
          </Link>
        </div>
      </div>
      <FilterPanelContainer>
        <FilterPanel
          applyButtonAria="apply filters for activity reports"
          filters={filters}
          filterConfig={[]}
          allUserRegions={regions}
        />
      </FilterPanelContainer>
      {/* TODO: Wrap this in a FilterContext.Provider component when filters added */}
      <CollabReports title="Collaboration Report Alerts" showCreateMsgOnEmpty emptyMsg={inProgressCollabEmptyMsg} />
      <CollabReports title="Approved Collaboration Reports" emptyMsg={approvedCollabEmptyMsg} />
    </div>
  );
};

export default CollabReportsLanding;
