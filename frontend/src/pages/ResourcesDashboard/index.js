import React, { useContext, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import FilterPanel from '../../components/filter/FilterPanel';
import { allRegionsUserHasPermissionTo } from '../../permissions';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import AriaLiveContext from '../../AriaLiveContext';
import ResourcesDashboardOverview from '../../widgets/ResourcesDashboardOverview';
import HorizontalTableWidget from '../../widgets/HorizontalTableWidget';

import './index.scss';
import { expandFilters } from '../../utils';

import UserContext from '../../UserContext';
import { RESOURCES_DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';

const FILTER_KEY = 'regional-resources-dashboard-filters';
export default function ResourcesDashboard() {
  const { user } = useContext(UserContext);
  const ariaLiveContext = useContext(AriaLiveContext);
  const regions = allRegionsUserHasPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const hasMultipleRegions = regions && regions.length > 1;
  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(
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

  // Apply filters.
  const onApplyFilters = (newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFilters([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFilters([
        ...newFilters,
      ]);
    }

    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to resources`);
  };

  // Remove Filters.
  const onRemoveFilter = (id, addBackDefaultRegions) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      if (addBackDefaultRegions) {
        // We always want the regions to appear in the URL.
        setFilters([...allRegionsFilters, ...newFilters]);
      } else {
        setFilters(newFilters);
      }
    }
  };

  const filtersToApply = expandFilters(filters);

  const headersData = ['Jan-22', 'Feb-22', 'Mar-22', 'Apr-22', 'May-22', 'Jun-22', 'Jul-22', 'Aug-22', 'Sep-22', 'Oct-22', 'Nov-22', 'Dec-22', 'Jan-23', 'Feb-23', 'Mar-23', 'Apr-23', 'May-23', 'Jun-23', 'Jul-23'];
  const testData = [
    {
      heading: 'https://test1.gov',
      isUrl: 'true',
      data: [
        {
          title: 'Jan-22',
          value: '17',
        },
        {
          title: 'Feb-22',
          value: '23',
        },
        {
          title: 'Mar-22',
          value: '55',
        },
        {
          title: 'Apr-22',
          value: '55',
        },
        {
          title: 'May-22',
          value: '55',
        },
        {
          title: 'Jun-22',
          value: '55',
        },
        {
          title: 'Jul-22',
          value: '55',
        },

        {
          title: 'Aug-22',
          value: '55',
        },
        {
          title: 'Sep-22',
          value: '55',
        },
        {
          title: 'Oct-22',
          value: '55',
        },
        {
          title: 'Nov-22',
          value: '55',
        },
        {
          title: 'Dec-22',
          value: '55',
        },
        {
          title: 'Jan-23',
          value: '55',
        },
        {
          title: 'Feb-23',
          value: '55',
        },
        {
          title: 'Mar-23',
          value: '55',
        },

        {
          title: 'Apr-23',
          value: '55',
        },
        {
          title: 'May-23',
          value: '55',
        },
        {
          title: 'June-23',
          value: '55',
        },
        {
          title: 'July-23',
          value: '55',
        },

        {
          title: 'total',
          value: '100',
        },
      ],
    },
    {
      heading: 'https://test1.gov',
      isUrl: 'true',
      data: [
        {
          title: 'Jan-22',
          value: '44',
        },
        {
          title: 'Feb-22',
          value: '15',
        },
        {
          title: 'Mar-22',
          value: '66',
        },
        {
          title: 'Apr-22',
          value: '55',
        },
        {
          title: 'May-22',
          value: '55',
        },
        {
          title: 'Jun-22',
          value: '55',
        },
        {
          title: 'Jul-22',
          value: '55',
        },
        {
          title: 'Aug-22',
          value: '55',
        },
        {
          title: 'Sep-22',
          value: '55',
        },
        {
          title: 'Oct-22',
          value: '55',
        },
        {
          title: 'Nov-22',
          value: '55',
        },
        {
          title: 'Dec-22',
          value: '55',
        },
        {
          title: 'Jan-23',
          value: '55',
        },
        {
          title: 'Feb-23',
          value: '55',
        },
        {
          title: 'Mar-23',
          value: '55',
        },
        {
          title: 'Apr-23',
          value: '55',
        },
        {
          title: 'May-23',
          value: '55',
        },
        {
          title: 'June-23',
          value: '55',
        },
        {
          title: 'July-23',
          value: '55',
        },
        {
          title: 'total',
          value: '100',
        },
      ],
    },
    {
      heading: 'Non Url',
      isUrl: 'false',
      data: [
        {
          title: 'Jan-22',
          value: '3',
        },
        {
          title: 'Feb-22',
          value: '77',
        },
        {
          title: 'Mar-22',
          value: '12',
        },
        {
          title: 'Apr-22',
          value: '55',
        },
        {
          title: 'May-22',
          value: '55',
        },
        {
          title: 'Jun-22',
          value: '55',
        },
        {
          title: 'Jul-22',
          value: '55',
        },
        {
          title: 'Aug-22',
          value: '55',
        },
        {
          title: 'Sep-22',
          value: '55',
        },
        {
          title: 'Oct-22',
          value: '55',
        },
        {
          title: 'Nov-22',
          value: '55',
        },
        {
          title: 'Dec-22',
          value: '55',
        },
        {
          title: 'Jan-23',
          value: '55',
        },
        {
          title: 'Feb-23',
          value: '55',
        },
        {
          title: 'Mar-23',
          value: '55',
        },
        {
          title: 'Apr-23',
          value: '55',
        },
        {
          title: 'May-23',
          value: '55',
        },
        {
          title: 'June-23',
          value: '55',
        },
        {
          title: 'July-23',
          value: '55',
        },
        {
          title: 'total',
          value: '100',
        },
      ],

    },
  ];

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
          Resource dashboard
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
        <ResourcesDashboardOverview
          filters={filtersToApply}
          fields={[
            'Reports with resources',
            'ECLKC Resources',
            'Recipients reached',
            'Participants reached',
          ]}
          showTooltips
        />
        <HorizontalTableWidget
          title="Resource use"
          subtitle="Showing the 10 resources cited most often on Activity Reports"
          headers={headersData}
          data={testData}
          loading={false}
          loadingLabel="Loading..."
          firstHeading="Resource URL:"
        />
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
