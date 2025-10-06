import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import { showFilterWithMyRegions } from '../regionHelpers';
import UserContext from '../../UserContext';
import CollabReports from './components/CollabReports';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import useFilters from '../../hooks/useFilters';
import './index.scss';
import NewReportButton from '../../components/NewReportButton';
import LandingMessage from '../../components/LandingMessage';

const FILTER_KEY = 'collab-landing-filters';

export const CollabReportsLanding = () => {
  const { user } = useContext(UserContext);

  const {
    hasMultipleRegions,
    defaultRegion,
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
            // istanbul ignore next = not easily tested
            () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
          }
      />
      <LandingMessage linkBase="/collaboration-reports/" />
      <div className="collab-report-header margin-top-0 margin-bottom-3 flex-column flex-align-start display-flex">
        <h1 className="landing tablet:margin-right-2 margin-bottom-0">
          {`Collaboration reports - ${regionLabel}`}
        </h1>
        <div className="margin-top-1">
          <NewReportButton
            to="/collaboration-reports/new/activity-summary"
          >
            New Collaboration Report
          </NewReportButton>
        </div>
      </div>
      <CollabReports title="My Collaboration Reports" showCreateMsgOnEmpty emptyMsg={inProgressCollabEmptyMsg} isAlerts />
      <CollabReports title="Approved Collaboration Reports" emptyMsg={approvedCollabEmptyMsg} />
    </div>
  );
};

export default CollabReportsLanding;
