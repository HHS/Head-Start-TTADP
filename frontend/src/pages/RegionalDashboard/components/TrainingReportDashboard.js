import { Alert, Grid, GridContainer } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet';
import { getSessionReportsTable } from '../../../fetchers/session';
import useFetch from '../../../hooks/useFetch';
import useRequestSort from '../../../hooks/useRequestSort';
import useSessionSort from '../../../hooks/useSessionSort';
import TRHoursOfTrainingByNationalCenter from '../../../widgets/TRHoursOfTrainingByNationalCenter';
import TRStandardGoalsList from '../../../widgets/TRStandardGoalsList';
import Overview from '../../../widgets/TrainingReportDashboardOverview';
import VTopicFrequency from '../../../widgets/VTopicFrequency';
import TrainingReportsTable from './TrainingReportsTable';

export default function TrainingReportDashboard({ filters }) {
  const [sortConfig, setSortConfig] = useSessionSort(
    {
      sortBy: 'Event_ID',
      direction: 'desc',
      activePage: 1,
      offset: 0,
    },
    'trainingReportsTable'
  );

  const requestSort = useRequestSort(setSortConfig);

  const { data, error } = useFetch(
    { rows: [], count: 0 },
    () => getSessionReportsTable(sortConfig, filters),
    [sortConfig, filters],
    'Unable to fetch training reports'
  );

  return (
    <>
      <Helmet>
        <title>Regional Dashboard - Training Reports</title>
      </Helmet>
      <GridContainer className="margin-0 padding-0">
        <Overview filters={filters} showTooltips loading={false} />
        <Grid row gap={2} className="flex-align-stretch margin-bottom-3">
          <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
            <TRStandardGoalsList
              filters={filters}
              title="Goal categories in Training Report sessions"
              subtitle="Data includes sessions approved on or after 09/01/2025."
            />
          </Grid>
          <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
            <TRHoursOfTrainingByNationalCenter
              filters={filters}
              loading={false}
              title="Hours of training by National Center"
              subtitle="Hours reported on Training Report sessions"
              xAxisLabel="National Center"
              yAxisLabel="Number of hours"
            />
          </Grid>
        </Grid>
        <Grid row>
          <VTopicFrequency
            filters={filters}
            loading={false}
            title="Number of TR sessions by topic"
          />
        </Grid>
        <Grid row className="margin-top-3">
          {error && (
            <Alert type="error" role="alert">
              {error}
            </Alert>
          )}
          <TrainingReportsTable
            data={data}
            title="Training Reports"
            loading={false}
            emptyMsg="No training reports found"
            requestSort={requestSort}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            filters={filters}
          />
        </Grid>
      </GridContainer>
    </>
  );
}

TrainingReportDashboard.defaultProps = {
  filters: [],
};

TrainingReportDashboard.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({})),
};
