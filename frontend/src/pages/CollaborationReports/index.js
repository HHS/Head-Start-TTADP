import React, { useContext, useMemo, useCallback } from 'react';

import { Helmet } from 'react-helmet';
import {
  Grid,
} from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import { allRegionsUserHasActivityReportPermissionTo } from '../../permissions';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import FilterPanel from '../../components/filter/FilterPanel';
import UserContext from '../../UserContext';
import CollabReportsTable from './components/CollabReportsTable';
import RegionPermissionModal from '../../components/RegionPermissionModal';

const FILTER_KEY = 'collab-landing-filters';

export const CollabReportsLanding = () => {
  // TODO: This is also in Landing component, refactor to
  const { user } = useContext(UserContext);
  // Determine Default Region.
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
  const setFilters = useCallback((newFilters) => {
    // pass through
    setFiltersInHook(newFilters);

    // TODO: Reset pagination when filters set
  }, [setFiltersInHook]);

  const regionLabel = `your region${(defaultRegion === 14 || hasMultipleRegions) ? 's' : ''}`;
  const inProgressCollabEmptyMsg = 'You have no Collaboration Reports in progress.';
  const approvedCollabEmptyMsg = 'You have no approved Collaboration Reports.';
  return (
    <>
      <Helmet>
        <title>Collaboration Reports</title>
      </Helmet>
      <>
        <RegionPermissionModal
          filters={filters}
          user={user}
          showFilterWithMyRegions={
            () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
          }
        />
        <Grid row gap>
          <Grid col={12} className="display-flex flex-wrap">
            <h1 className="landing margin-top-0 margin-bottom-3 margin-right-2">{`Collaboration reports - ${regionLabel}`}</h1>
            <div>
              <Link
                to="/collaboration-report/new"
                className="usa-button smart-hub--new-report-btn"
              >
                <span className="smart-hub--plus">+</span>
                <span className="smart-hub--new-report">New Collaboration Report</span>
              </Link>
            </div>
          </Grid>
        </Grid>
        <Grid col={12} className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
          <FilterPanel
            applyButtonAria="apply filters for activity reports"
            filters={filters}
            filterConfig={filtersToUse}
            allUserRegions={regions}
          />
        </Grid>
        {/* TODO: Wrap this in a FilterContext.Provider component */}
        <CollabReportsTable title="Collaboration Report Alerts" showCreateMsgOnEmpty emptyMsg={inProgressCollabEmptyMsg} />
        <CollabReportsTable title="Approved Collaboration Reports" emptyMsg={approvedCollabEmptyMsg} />
      </>
    </>
  );
};

export default CollabReportsLanding;
