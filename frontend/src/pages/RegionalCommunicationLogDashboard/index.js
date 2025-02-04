import React, { useContext, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { Helmet } from 'react-helmet';
import { Grid, Link } from '@trussworks/react-uswds';
import { getUserRegions } from '../../permissions';
import UserContext from '../../UserContext';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import { formatDateRange } from '../../utils';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import FilterPanel from '../../components/filter/FilterPanel';
import { DASHBOARD_FILTER_CONFIG } from './constants';
import RegionalCommLogTable from './components/RegionalCommLogTable';
import { regionFilter } from '../../components/filter/communicationLogFilters';

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
});

const FILTER_KEY = 'regional-communication-log-filters';

const createDefaultFilters = (
  hasCentralOffice,
  userHasOnlyOneRegion,
  defaultRegion,
  allRegionsFilters,
) => {
  const dateFilter = {
    id: uuidv4(),
    topic: 'communicationDate',
    condition: 'is within',
    query: defaultDate,
  };

  if (hasCentralOffice) {
    return [...allRegionsFilters, dateFilter];
  }

  if (userHasOnlyOneRegion) {
    return [dateFilter];
  }

  return [
    {
      id: uuidv4(),
      topic: 'region',
      condition: 'is',
      query: defaultRegion,
    },
    dateFilter,
  ];
};

export default function RegionalCommunicationLog() {
  const { user } = useContext(UserContext);
  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);
  const regions = useMemo(() => getUserRegions(user), [user]);
  const userHasOnlyOneRegion = useMemo(() => regions.length === 1, [regions]);
  const defaultRegion = useMemo(() => regions[0].toString(), [regions]);

  // eslint-disable-next-line max-len
  const allRegionsFilters = useMemo(() => (userHasOnlyOneRegion ? [] : buildDefaultRegionFilters(regions)), [regions, userHasOnlyOneRegion]);

  const filterConfig = useMemo(() => [
    // This is just the communicationDate filter for now.
    ...DASHBOARD_FILTER_CONFIG,
    // When they have multiple regions, we want to show the region filter.
    ...(userHasOnlyOneRegion ? [] : [regionFilter]),
  ], [userHasOnlyOneRegion]);

  const defaultFilters = useMemo(() => createDefaultFilters(
    hasCentralOffice,
    userHasOnlyOneRegion,
    defaultRegion,
    allRegionsFilters,
  ), [hasCentralOffice, userHasOnlyOneRegion, defaultRegion, allRegionsFilters]);

  const [filtersToApply, setFiltersInHook] = useSessionFiltersAndReflectInUrl(
    FILTER_KEY,
    defaultFilters,
  );

  const onApplyFilters = (newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFiltersInHook([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFiltersInHook(newFilters);
    }
  };

  // Remove Filters.
  const onRemoveFilter = (id, addBackDefaultRegions) => {
    const newFilters = [...filtersToApply];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      if (addBackDefaultRegions) {
        // We always want the regions to appear in the URL.
        setFiltersInHook([...allRegionsFilters, ...newFilters]);
      } else {
        setFiltersInHook(newFilters);
      }
    }
  };

  return (
    <div className="ttahub-dashboard">
      <Helmet>
        <title>Regional Communication Log</title>
      </Helmet>
      <RegionPermissionModal
        filters={filtersToApply}
        user={user}
        showFilterWithMyRegions={
          () => showFilterWithMyRegions(allRegionsFilters, filtersToApply, setFiltersInHook)
        }
      />
      <div className="display-flex">
        <h1 className="landing margin-top-0 margin-bottom-3">
          Communication logs -
          {' '}
          {userHasOnlyOneRegion ? 'your region' : 'your regions'}
        </h1>
        <div>
          <Link
            to="/regional-communication-log/communication/new"
            className="usa-button smart-hub--new-report-btn margin-left-4"
          >
            <span className="smart-hub--plus">+</span>
            <span className="smart-hub--new-report">Add communication</span>
          </Link>
        </div>
      </div>

      <FilterPanelContainer>
        <FilterPanel
          applyButtonAria="apply filters for regional communication log dashboard"
          filters={filtersToApply}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={filterConfig}
          allUserRegions={regions}
        />
      </FilterPanelContainer>
      <Grid row gap="lg">
        <Grid desktop={{ col: 12 }} tabletLg={{ col: 12 }} className="display-flex flex-align-stretch">
          <RegionalCommLogTable filters={filtersToApply} />
        </Grid>
      </Grid>
    </div>
  );
}
