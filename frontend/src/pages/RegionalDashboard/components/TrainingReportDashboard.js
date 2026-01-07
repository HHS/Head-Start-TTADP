import React from 'react';
import { Helmet } from 'react-helmet';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import Overview from '../../../widgets/TrainingReportDashboardOverview';
import TRStandardGoalsList from '../../../widgets/TRStandardGoalsList';
import TRHoursOfTrainingByNationalCenter from '../../../widgets/TRHoursOfTrainingByNationalCenter';
import VTopicFrequency from '../../../widgets/VTopicFrequency';

export default function TrainingReportDashboard() {
  return (
    <>
      <Helmet>
        <title>Regional Dashboard - Training Reports</title>
      </Helmet>
      <GridContainer className="margin-0 padding-0">
        <Overview
          filters={[]}
          showTooltips
          loading={false}
        />
        <Grid row gap={2} className="flex-align-stretch margin-bottom-3">
          <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
            <TRStandardGoalsList
              filters={[]}
              title="Goal categories in Training Report sessions"
            />
          </Grid>
          <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
            <TRHoursOfTrainingByNationalCenter
              filters={[]}
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
            filters={[]}
            loading={false}
            title="Number of TR sessions by topic"
          />
        </Grid>
      </GridContainer>
    </>
  );
}
