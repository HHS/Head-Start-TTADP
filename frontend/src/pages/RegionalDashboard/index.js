import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import FilterMenu from '../../components/filter/FilterMenu';
import { formatDateRange } from '../../components/DateRangeSelect';
import DashboardOverview from '../../widgets/DashboardOverview';
import TopicFrequencyGraph from '../../widgets/TopicFrequencyGraph';
import { getUserRegions } from '../../permissions';
import ReasonList from '../../widgets/ReasonList';
import TotalHrsAndGrantee from '../../widgets/TotalHrsAndGranteeGraph';
import './index.css';
import FilterPills from '../../components/filter/FilterPills';
import { expandFilters } from '../../utils';
import useUrlFilters from '../../hooks/useUrlFilters';
import ActivityReportsTable from '../../components/ActivityReportsTable';

/**
 *
 * format the date range for display
 */
function getDateTimeObject(dateRange) {
  const timestamp = formatDateRange({
    forDateTime: true,
    string: dateRange,
  });
  const label = formatDateRange({
    withSpaces: true,
    string: dateRange,
  });

  return { timestamp, label };
}

export default function RegionalDashboard({ user }) {
  const hasCentralOffice = user && user.homeRegionId && user.homeRegionId === 14;
  const defaultDate = formatDateRange({
    lastThirtyDays: true,
    forDateTime: true,
  });

  const regions = getUserRegions(user);
  const defaultRegion = hasCentralOffice ? 14 : regions[0];

  const [filters, setFilters] = useUrlFilters([
    {
      id: uuidv4(),
      topic: 'region',
      condition: 'Contains',
      query: defaultRegion,
    },
    {
      id: uuidv4(),
      topic: 'startDate',
      condition: 'Is within',
      query: defaultDate,
    },
  ]);

  const startDateFilter = filters.find((filter) => filter.topic === 'startDate');
  const regionFilter = filters.find((filter) => filter.topic === 'region');

  const dateTime = startDateFilter ? getDateTimeObject(startDateFilter.query) : '';
  const appliedRegion = regionFilter ? filters.find((filter) => filter.topic === 'region').query : '';

  const onApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      setFilters(newFilters);
    }
  };

  if (!user) {
    return (
      <div>Loading...</div>
    );
  }

  const filtersToApply = expandFilters(filters);

  const dateRangeOptions = [
    {
      label: 'Last 30 days',
      value: 1,
      range: formatDateRange({ lastThirtyDays: true, forDateTime: true }),
    },
    {
      label: 'Custom date range',
      value: 2,
      range: '',
    },
  ];

  return (
    <div className="ttahub-dashboard">
      <Helmet titleTemplate="%s - Dashboard - TTA Hub" defaultTitle="TTA Hub - Dashboard" />
      <>
        <Helmet titleTemplate="%s - Dashboard - TTA Hub" defaultTitle="TTA Hub - Dashboard" />
        <h1 className="ttahub--dashboard-title">
          {appliedRegion === 14 ? 'Regional' : `Region ${appliedRegion}`}
          {' '}
          TTA Activity Dashboard
        </h1>
        <Grid className="ttahub-dashboard--filters display-flex flex-wrap flex-align-center margin-top-2 margin-bottom-6">
          <FilterMenu
            filters={filters}
            onApplyFilters={onApplyFilters}
            dateRangeOptions={dateRangeOptions}
          />
          <FilterPills filters={filters} onRemoveFilter={onRemoveFilter} />
        </Grid>

        <GridContainer className="margin-0 padding-0">
          <DashboardOverview
            filters={filtersToApply}
          />
          <Grid row gap={2}>
            <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
              <ReasonList
                filters={filtersToApply}
                dateTime={dateTime}
              />
            </Grid>
            <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
              <TotalHrsAndGrantee
                filters={filtersToApply}
                dateTime={dateTime}
              />
            </Grid>
          </Grid>
          <Grid row>
            <TopicFrequencyGraph
              filters={filtersToApply}
              dateTime={dateTime}
            />
          </Grid>
          <Grid row>
            <ActivityReportsTable
              filters={filters}
              showFilter={false}
              tableCaption="Activity reports"
              dateTime={dateTime}
            />
          </Grid>
        </GridContainer>
      </>
    </div>

  );
}

RegionalDashboard.propTypes = {
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

RegionalDashboard.defaultProps = {
  user: null,
};
