import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet';
import ActivityReportsTable from '../../../components/ActivityReportsTable';
import FilterContext from '../../../FilterContext';
import DashboardOverview from '../../../widgets/DashboardOverview';
import StandardGoalList from '../../../widgets/StandardGoalList';
import TopicFrequencyGraph from '../../../widgets/TopicFrequencyGraph';
import TotalHrsAndRecipient from '../../../widgets/TotalHrsAndRecipientGraph';

export default function ActivityReportDashboard({
  filtersToApply,
  resetPagination,
  setResetPagination,
  filterKey,
}) {
  return (
    <>
      <Helmet>
        <title>Regional Dashboard - Activity Reports</title>
      </Helmet>
      <DashboardOverview
        filters={filtersToApply}
        fields={[
          'Recipients served',
          'Grants served',
          'Activity reports',
          'Participants',
          'Hours of TTA',
        ]}
        showTooltips
      />
      <Grid row gap={2} className="flex-align-stretch margin-bottom-3">
        <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
          <StandardGoalList filters={filtersToApply} />
        </Grid>
        <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
          <TotalHrsAndRecipient filters={filtersToApply} />
        </Grid>
      </Grid>
      <Grid row>
        <TopicFrequencyGraph filters={filtersToApply} />
      </Grid>
      <Grid row>
        <FilterContext.Provider value={{ filterKey }}>
          <ActivityReportsTable
            filters={filtersToApply}
            showFilter={false}
            tableCaption="Activity reports"
            exportIdPrefix="rd-"
            resetPagination={resetPagination}
            setResetPagination={setResetPagination}
          />
        </FilterContext.Provider>
      </Grid>
    </>
  );
}

ActivityReportDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  resetPagination: PropTypes.bool.isRequired,
  setResetPagination: PropTypes.func.isRequired,
  filterKey: PropTypes.string.isRequired,
};
