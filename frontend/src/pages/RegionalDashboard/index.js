import React, { useState } from 'react';
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

  // eslint-disable-next-line max-len
  const [appliedRegion] = useState(hasCentralOffice ? 14 : regions[0]);
  const [dateRange] = useState(defaultDate);

  // this can be killed when we add the new filters to this page
  const [roleFilter, updateRoleFilter] = useState();

  /*
    *    the idea is that this filters variable, which roughly matches
    *    the implementation on the landing page,
    *    would be passed down into each visualization
    */

  const filters = [
    {
      id: uuidv4(),
      topic: 'region',
      condition: 'Contains',
      query: appliedRegion,
    },
    {
      id: uuidv4(),
      topic: 'startDate',
      condition: 'Is within',
      query: dateRange,
    },
  ];

  const dateTime = getDateTimeObject(dateRange);

  const onApplyFilters = () => {};

  const onRemoveFilter = () => {};

  const updateRoles = (selectedRoles) => {
    updateRoleFilter(selectedRoles);
  };

  if (!user) {
    return (
      <div>Loading...</div>
    );
  }

  return (
    <div className="ttahub-dashboard">

      <Helmet titleTemplate="%s - Dashboard - TTA Hub" defaultTitle="TTA Hub - Dashboard" />
      <>
        <Helmet titleTemplate="%s - Dashboard - TTA Hub" defaultTitle="TTA Hub - Dashboard" />
        <Grid className="ttahub-dashboard--filter-row flex-fill display-flex flex-align-center flex-align-self-center flex-row flex-wrap margin-bottom-2">
          <Grid col="auto" className="flex-wrap">
            <h1 className="ttahub--dashboard-title">
              {appliedRegion === 14 ? 'Regional' : `Region ${appliedRegion}`}
              {' '}
              TTA Activity Dashboard
            </h1>
          </Grid>
          <Grid className="ttahub-dashboard--filters display-flex flex-wrap flex-align-center margin-top-2 desktop:margin-top-0">
            <FilterMenu filters={filters} onApplyFilters={onApplyFilters} />
            <FilterPills filters={filters} onRemoveFilter={onRemoveFilter} />
          </Grid>
        </Grid>
        <GridContainer className="margin-0 padding-0">
          <DashboardOverview
            filters={filters}
          />
          <Grid row gap={2}>
            <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
              <ReasonList
                filters={filters}
                dateTime={dateTime}
              />
            </Grid>
            <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
              <TotalHrsAndGrantee
                filters={filters}
                dateTime={dateTime}
              />
            </Grid>
          </Grid>
          <Grid row>
            <TopicFrequencyGraph
              filters={
                roleFilter
                  ? [...filters,
                    ...roleFilter.map((role) => ({
                      id: uuidv4(),
                      topic: 'role',
                      condition: 'Contains',
                      query: role,
                    }))] : filters
              }
              onApplyRoles={updateRoles}
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
