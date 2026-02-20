import React, { useContext, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import { DECIMAL_BASE } from '@ttahub/common';
import { getUserRegions, canCreateCommunicationLog } from '../../permissions';
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
import NewReportButton from '../../components/NewReportButton';
import './index.scss';

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${format(new Date(), 'yyyy/MM/dd')}`,
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
  const canCreateCommLog = useMemo(
    () => canCreateCommunicationLog(user, parseInt(defaultRegion, DECIMAL_BASE)),
    [user, defaultRegion],
  );

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
      <div className="comm-log-header flex-align-center margin-top-0 margin-bottom-3">
        <h1 className="landing">
          Communication logs -
          {' '}
          {userHasOnlyOneRegion ? 'your region' : 'your regions'}
        </h1>
        {canCreateCommLog && (
          <div>
            <NewReportButton to={`/communication-log/region/${defaultRegion}/log/new`}>
              Add communication
            </NewReportButton>
          </div>
        )}
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
