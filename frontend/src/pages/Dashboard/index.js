import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import Container from '../../components/Container';
import RegionalSelect from '../../components/RegionalSelect';
import DateRangeSelect from './components/DateRangeSelect';
import DashboardOverview from '../../widgets/DashboardOverview';
import TopicFrequencyGraph from '../../widgets/TopicFrequencyGraph';
import DateTime from '../../components/DateTime';
import { getUserRegions } from '../../permissions';
import { CUSTOM_DATE_RANGE } from './constants';
import formatDateRange from './formatDateRange';
import ReasonList from '../../widgets/ReasonList';
import TotalHrsAndGrantee from '../../widgets/TotalHrsAndGranteeGraph';
import './index.css';

function Dashboard({ user }) {
  const [appliedRegion, updateAppliedRegion] = useState(0);
  const [regions, updateRegions] = useState([]);
  const [regionsFetched, updateRegionsFetched] = useState(false);
  const [selectedDateRangeOption, updateSelectedDateRangeOption] = useState(1);
  const [hasCentralOffice, updateHasCentralOffice] = useState(false);
  const [dateRange, updateDateRange] = useState('');
  const [gainFocus, setGainFocus] = useState(false);
  const [dateTime, setDateTime] = useState({ timestamp: '', label: '' });
  const [dateRangeLoaded, setDateRangeLoaded] = useState(false);

  /*
    *    the idea is that this filters variable, which roughly matches
    *    the implementation on the landing page,
    *    would be passed down into each visualization
    */

  const [filters, updateFilters] = useState([]);

  /**
   * sets whether a user has central office(14) amongst their permissions
   */
  useEffect(() => {
    if (user) {
      updateHasCentralOffice(!!user.permissions.find((permission) => permission.regionId === 14));
    }
  }, [user]);

  /**
  * if a user has not applied a region, we apply the first region
  * if they have central office, we apply that instead
  */
  useEffect(() => {
    if (appliedRegion === 0) {
      if (hasCentralOffice) {
        updateAppliedRegion(14);
      } else if (regions[0]) {
        updateAppliedRegion(regions[0]);
      }
    }
  }, [appliedRegion, hasCentralOffice, regions]);

  // if the regions have been fetched, this smooths out errors around async fetching
  // of regions vs rendering
  useEffect(() => {
    if (!regionsFetched && regions.length < 1) {
      updateRegionsFetched(true);
      updateRegions(getUserRegions(user));
    }
  }, [regions, regionsFetched, user]);

  useEffect(() => {
    /**
     *
     * format the date range for display
     */

    const timestamp = formatDateRange({
      lastThirtyDays: selectedDateRangeOption === 1,
      forDateTime: true,
      string: dateRange,
    });
    const label = formatDateRange({
      lastThirtyDays: selectedDateRangeOption === 1,
      withSpaces: true,
      string: dateRange,
    });

    setDateTime({ timestamp, label });
  }, [selectedDateRangeOption, dateRange]);

  useEffect(() => {
    if (!dateRangeLoaded) {
      updateDateRange(formatDateRange({
        lastThirtyDays: selectedDateRangeOption === 1,
        forDateTime: true,
      }));

      setDateRangeLoaded(true);
    }
  }, [dateRangeLoaded, selectedDateRangeOption]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // The number and nature of the filters is static, so we can just update them like so
    const filtersToApply = [
      {
        id: uuidv4(), // note to self- is this just for unique keys/.map?
        topic: 'region',
        condition: 'Is equal to',
        query: appliedRegion,
      },
      {
        id: uuidv4(),
        topic: 'startDate',
        condition: 'Is within',
        query: dateRange,
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

    if (isCustom) {
      // set focus to DateRangePicker 1st input
      setGainFocus(true);
    }
  }, [selectedDateRangeOption]);

  const onApplyRegion = (region) => {
    const regionId = region ? region.value : appliedRegion;
    updateAppliedRegion(regionId);
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
      <Helmet titleTemplate="%s - Dashboard - TTA Smart Hub" defaultTitle="TTA Smart Hub - Dashboard" />

      <>
        <Helmet titleTemplate="%s - Dashboard - TTA Smart Hub" defaultTitle="TTA Smart Hub - Dashboard" />
        <Grid className="ttahub-dashboard--filter-row flex-fill display-flex flex-align-center flex-align-self-center flex-row flex-wrap margin-bottom-2">
          <Grid col="auto" className="flex-wrap">
            <h1 className="ttahub--dashboard-title">
              {appliedRegion === 14 ? 'Regional' : `Region ${appliedRegion}` }
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
              gainFocus={gainFocus}
              dateTime={dateTime}
            />
            <DateTime classNames="display-flex flex-align-center" timestamp={dateTime.timestamp} label={dateTime.label} />
          </Grid>
        </Grid>
        <GridContainer className="margin-0 padding-0">
          <DashboardOverview
            filters={filters}
            region={appliedRegion}
            allRegions={regions}
            dateRange={dateRange}
            skipLoading
          />
          <Grid row gap={2}>
            <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
              <ReasonList
                filters={filters}
                region={appliedRegion}
                allRegions={getUserRegions(user)}
                dateRange={dateRange}
                skipLoading
                dateTime={dateTime}
              />
            </Grid>
            <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
              <Container className="ttahub-total-hours-container shadow-2" padding={3}>
                <TotalHrsAndGrantee
                  filters={filters}
                  region={appliedRegion}
                  allRegions={regions}
                  dateRange={dateRange}
                  skipLoading
                  dateTime={dateTime}
                />
              </Container>
            </Grid>
          </Grid>
          <Grid row>
            <TopicFrequencyGraph
              filters={filters}
              region={appliedRegion}
              allRegions={regions}
              dateRange={dateRange}
              skipLoading
              dateTime={dateTime}
            />
          </Grid>
          <Grid row>
            <Grid col="auto" />
          </Grid>
        </GridContainer>
      </>
    </div>

  );
}

Dashboard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

Dashboard.defaultProps = {
  user: null,
};

export default Dashboard;
