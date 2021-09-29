import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import { Grid, GridContainer } from '@trussworks/react-uswds';

import RegionalSelect from '../../components/RegionalSelect';
import DateRangeSelect from './components/DateRangeSelect';
import DashboardOverview from '../../widgets/DashboardOverview';
import TopicFrequencyGraph, { ROLES_MAP } from '../../widgets/TopicFrequencyGraph';
import DateTime from '../../components/DateTime';
import { getUserRegions } from '../../permissions';
import { CUSTOM_DATE_RANGE } from './constants';
import formatDateRange from './formatDateRange';
import ReasonList from '../../widgets/ReasonList';
import TotalHrsAndGrantee from '../../widgets/TotalHrsAndGranteeGraph';
import './index.css';

/**
 *
 * format the date range for display
 */
function getDateTimeObject(selectedOption, dateRange) {
  const timestamp = formatDateRange({
    lastThirtyDays: selectedOption === 1,
    forDateTime: true,
    string: dateRange,
  });
  const label = formatDateRange({
    lastThirtyDays: selectedOption === 1,
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
  const [appliedRegion, updateAppliedRegion] = useState(hasCentralOffice ? 14 : regions[0]);
  const [selectedDateRangeOption, updateSelectedDateRangeOption] = useState(1);
  const [dateRange, updateDateRange] = useState(defaultDate);
  const [dateTime, setDateTime] = useState(getDateTimeObject(1, defaultDate));

  /*
    *    the idea is that this filters variable, which roughly matches
    *    the implementation on the landing page,
    *    would be passed down into each visualization
    */

  const [filters, updateFilters] = useState([]);
  const [roleFilter, updateRoleFilter] = useState();

  useEffect(() => {
    setDateTime(getDateTimeObject(selectedDateRangeOption, dateRange));
  }, [selectedDateRangeOption, dateRange]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // The number and nature of the filters is static, so we can just update them like so
    const filtersToApply = [
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
      {
        id: uuidv4(),
        topic: 'modelType',
        condition: 'Is',
        query: 'activityReport',
      },
    ];

    updateFilters(filtersToApply);
  },
  [appliedRegion, dateRange, user]);

  useEffect(() => {
    const isCustom = selectedDateRangeOption === CUSTOM_DATE_RANGE;
    if (!isCustom) {
      const newRange = formatDateRange({ lastThirtyDays: true, forDateTime: true });
      updateDateRange(newRange);
    }
  }, [selectedDateRangeOption]);

  const onApplyRegion = (region) => {
    const regionId = region ? region.value : appliedRegion;
    updateAppliedRegion(regionId);
  };

  const updateRoles = (selectedRoles) => {
    updateRoleFilter(selectedRoles.map((role) => ROLES_MAP.find((r) => r.selectValue === role)).map((r) => r.value).join(','));
  };

  const onApplyDateRange = (range) => {
    const rangeId = range ? range.value : selectedDateRangeOption;
    updateSelectedDateRangeOption(rangeId);
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
            {regions.length > 1
              && (
                <RegionalSelect
                  regions={regions}
                  onApply={onApplyRegion}
                  hasCentralOffice={hasCentralOffice}
                  appliedRegion={appliedRegion}
                />
              )}
            <DateRangeSelect
              selectedDateRangeOption={selectedDateRangeOption}
              onApply={onApplyDateRange}
              applied={selectedDateRangeOption}
              customDateRangeOption={CUSTOM_DATE_RANGE}
              dateRange={dateRange}
              updateDateRange={updateDateRange}
              dateTime={dateTime}
            />
            <DateTime classNames="display-flex flex-align-center" timestamp={dateTime.timestamp} label={dateTime.label} />
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
                  ? [...filters, {
                    id: uuidv4(),
                    topic: 'role',
                    condition: 'Contains',
                    query: roleFilter,
                  }] : filters
              }
              updateRoles={updateRoles}
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
