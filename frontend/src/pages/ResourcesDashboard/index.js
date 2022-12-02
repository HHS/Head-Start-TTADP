import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import FilterPanel from '../../components/filter/FilterPanel';
import ResourceList from '../../widgets/ResourceList';
import ResourcesDashboardOverview from '../../widgets/ResourcesDashboardOverview';

import './index.scss';
import { expandFilters } from '../../utils';

import UserContext from '../../UserContext';
import { RESOURCES_DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import { showFilterWithMyRegions } from '../regionHelpers';
import useDefaultFilters from '../filtersHelper';

const FILTER_KEY = 'regional-resources-dashboard-filters';
export default function ResourcesDashboard() {
  const { user } = useContext(UserContext);
  const {
    allRegionsFilters,
    regions,
    onApplyFilters,
    onRemoveFilter,
    filters,
    setFilters,
  } = useDefaultFilters(user, FILTER_KEY);

  const filtersToApply = expandFilters(filters);

  return (
    <div className="ttahub-resources-dashboard">
      <Helmet titleTemplate="%s - Resources Dashboard - TTA Hub" defaultTitle="TTA Hub - Resources Dashboard" />
      <>
        <Helmet titleTemplate="%s - Resources Dashboard - TTA Hub" defaultTitle="TTA Hub - Resources Dashboard" />
        <RegionPermissionModal
          filters={filters}
          user={user}
          showFilterWithMyRegions={
            () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
          }
        />
        <h1 className="landing">
          Resources dashboard
        </h1>
        <Grid className="ttahub-resources-dashboard--filters display-flex flex-wrap flex-align-center margin-y-2">
          <FilterPanel
            applyButtonAria="apply filters for resources dashboard"
            filters={filters}
            onApplyFilters={onApplyFilters}
            onRemoveFilter={onRemoveFilter}
            filterConfig={RESOURCES_DASHBOARD_FILTER_CONFIG}
            allUserRegions={regions}
          />
        </Grid>
        <GridContainer className="margin-0 padding-0">
          <ResourcesDashboardOverview
            filters={filtersToApply}
            fields={[
              'ECLKC resources',
              'Non ECLKC resources',
              'No resources',
            ]}
            showTooltips
          />
          <Grid>
            <ResourceList
              filters={filtersToApply}
            />
          </Grid>
        </GridContainer>
      </>
    </div>

  );
}

ResourcesDashboard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

ResourcesDashboard.defaultProps = {
  user: null,
};
