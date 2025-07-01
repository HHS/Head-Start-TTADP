import React, { useContext } from 'react';

import { Helmet } from 'react-helmet';
import {
  Grid,
} from '@trussworks/react-uswds';
import { allRegionsUserHasActivityReportPermissionTo } from '../../permissions';
import FilterContext from '../../FilterContext';
import UserContext from '../../UserContext';
import CollabReportsTable from './components/CollabReportsTable';

const FILTER_KEY = 'collab-landing-filters';

export const CollabReportsLanding = () => {
  // TODO: This is also in Landing component, refactor to
  const { user } = useContext(UserContext);
  // Determine Default Region.
  const regions = allRegionsUserHasActivityReportPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const hasMultipleRegions = regions?.length > 1;

  const regionLabel = `your region${(defaultRegion === 14 || hasMultipleRegions) ? 's' : ''}`;
  return (
    <>
      <Helmet>
        <title>Collaboration Reports</title>
      </Helmet>
      <>
        <Grid row gap>
          <Grid col={12} className="display-flex flex-wrap">
            <h1 className="landing margin-top-0 margin-bottom-3 margin-right-2">{`Collaboration reports - ${regionLabel}`}</h1>
          </Grid>
        </Grid>
        {/* <Grid col={12} className="display-flex flex-wrap
          flex-align-center flex-gap-1 margin-bottom-2">
          <FilterPanel
            applyButtonAria="apply filters for activity reports"
            filters={filters}
            onApplyFilters={onApply}
            onRemoveFilter={onRemoveFilter}
            filterConfig={filtersToUse}
            allUserRegions={regions}
          />
        </Grid> */}
        {/* <FilterContext.Provider value={{ filterKey: FILTER_KEY }}> */}
        <CollabReportsTable />
        {/* </FilterContext.Provider> */}
      </>
    </>
  );
};

export default CollabReportsLanding;
