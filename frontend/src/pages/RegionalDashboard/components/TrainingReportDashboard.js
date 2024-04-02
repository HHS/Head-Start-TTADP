import React from 'react';
import { Helmet } from 'react-helmet';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import Overview from '../../../widgets/TrainingReportDashboardOverview';

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
        <Grid row gap={2}>
          <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }} />
          <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }} />
        </Grid>
        <Grid row />
        <Grid row />
      </GridContainer>
    </>
  );
}
