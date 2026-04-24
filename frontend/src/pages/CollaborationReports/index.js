import React, { useContext, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { showFilterWithMyRegions } from '../regionHelpers';
import UserContext from '../../UserContext';
import CollabReports from './components/CollabReports';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import FilterPanel from '../../components/filter/FilterPanel';
import useFilters from '../../hooks/useFilters';
import { COLLAB_REPORT_FILTER_CONFIG } from './constants';
import { expandFilters } from '../../utils';
import NewReportButton from '../../components/NewReportButton';
import LandingMessage from '../../components/LandingMessage';
import './index.scss';

const FILTER_KEY = 'collab-landing-filters';

export const CollabReportsLanding = () => {
  const { user } = useContext(UserContext);

  const {
    regions,
    defaultRegion,
    allRegionsFilters,
    hasMultipleRegions,
    filters,
    setFilters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
  } = useFilters(
    user,
    FILTER_KEY,
    true, // manage regions
    [],
    COLLAB_REPORT_FILTER_CONFIG,
  );
  const filtersToApply = useMemo(() => expandFilters(filters), [filters]);

  const regionLabel = `your region${(defaultRegion === 14 || hasMultipleRegions) ? 's' : ''}`;
  const inProgressCollabEmptyMsg = 'You have no Collaboration Reports in progress.';
  const approvedCollabEmptyMsg = 'You have no approved Collaboration Reports.';
  return (
    <div className="ttahub-dashboard">
      <Helmet>
        <title>Collaboration Reports</title>
      </Helmet>
      <RegionPermissionModal
        filters={filtersToApply}
        user={user}
        showFilterWithMyRegions={
            // istanbul ignore next = not easily tested
            () => showFilterWithMyRegions(allRegionsFilters, filtersToApply, setFilters)
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
      <FilterPanelContainer>
        <FilterPanel
          applyButtonAria="apply filters for collaboration reports"
          filters={filtersToApply}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={filterConfig}
          allUserRegions={regions}
        />
      </FilterPanelContainer>
      <CollabReports title="My Collaboration Reports" showCreateMsgOnEmpty emptyMsg={inProgressCollabEmptyMsg} filters={filtersToApply} isAlerts />
      <CollabReports title="Approved Collaboration Reports" emptyMsg={approvedCollabEmptyMsg} filters={filtersToApply} />
    </div>
  );
};

export default CollabReportsLanding;
