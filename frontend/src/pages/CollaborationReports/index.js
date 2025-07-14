import React, { useContext, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import { allRegionsUserHasActivityReportPermissionTo } from '../../permissions';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import FilterPanel from '../../components/filter/FilterPanel';
import UserContext from '../../UserContext';
import CollabReports from './components/CollabReports';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import './index.scss';

const FILTER_KEY = 'collab-landing-filters';

export const CollabReportsLanding = () => {
  // TODO: Very similar logic in ActivityReportsLanding, consider refactoring
  const { user } = useContext(UserContext);
  const regions = allRegionsUserHasActivityReportPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const hasMultipleRegions = regions?.length > 1;
  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);
  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl(
    FILTER_KEY,
    defaultRegion !== 14
      && defaultRegion !== 0
      && hasMultipleRegions
      ? [{
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: defaultRegion,
      }]
      : allRegionsFilters,
  );
  // Empty config for now
  const filtersToUse = [];
  // TODO: Filter logic is not part of work of TTAHUB-3999 so empty for now
  const setFilters = useCallback((newFilters) => {
    // pass through
    setFiltersInHook(newFilters);
  }, [setFiltersInHook]);

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
            to="/collaboration-report/new"
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
          filterConfig={filtersToUse}
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
