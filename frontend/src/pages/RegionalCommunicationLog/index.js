import React, { useContext, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import { getUserRegions } from '../../permissions';
import UserContext from '../../UserContext';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import { expandFilters, formatDateRange } from '../../utils';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import FilterPanel from '../../components/filter/FilterPanel';
import { DASHBOARD_FILTER_CONFIG } from './constants';

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
});

const FILTER_KEY = 'regional-communication-log-filters';

export default function RegionalCommunicationLog() {
  const { user } = useContext(UserContext);
  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);
  const regions = useMemo(() => getUserRegions(user), [user]);
  const userHasOnlyOneRegion = useMemo(() => regions.length === 1, [regions]);
  const defaultRegion = useMemo(() => regions[0].toString(), [regions]);

  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);

  const getFiltersWithAllRegions = () => {
    const filtersWithAllRegions = [...allRegionsFilters];
    filtersWithAllRegions.push({
      id: uuidv4(),
      topic: 'communicationDate',
      condition: 'is within',
      query: defaultDate,
    });
    return filtersWithAllRegions;
  };

  const centralOfficeWithAllRegionFilters = getFiltersWithAllRegions();

  const defaultFilters = useMemo(() => {
    if (hasCentralOffice) {
      return centralOfficeWithAllRegionFilters;
    }

    return [
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: defaultRegion,
      },
      {
        id: uuidv4(),
        topic: 'communicationDate',
        condition: 'is within',
        query: defaultDate,
      },
    ];
  }, [defaultRegion, hasCentralOffice, centralOfficeWithAllRegionFilters]);

  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl(FILTER_KEY, defaultFilters);

  // Apply filters.
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
    const newFilters = [...filters];
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

  // eslint-disable-next-line no-unused-vars
  const filtersToApply = expandFilters(filters);

  return (
    <div className="ttahub-dashboard">
      <Helmet>
        <title>Regional Communication Log</title>
      </Helmet>
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={
          () => showFilterWithMyRegions(allRegionsFilters, filters, setFiltersInHook)
        }
      />
      <h1 className="landing margin-top-0 margin-bottom-3">
        {userHasOnlyOneRegion ? `Region ${defaultRegion}` : 'Regional'}
        {' '}
        Communication Log
      </h1>
      <FilterPanelContainer>
        <FilterPanel
          applyButtonAria="apply filters for regional dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={DASHBOARD_FILTER_CONFIG}
          allUserRegions={regions}
        />
      </FilterPanelContainer>
      <Grid row gap="lg">
        <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }} className="display-flex flex-align-stretch">
          &nbsp;
        </Grid>
      </Grid>
    </div>
  );
}
