import React from 'react';
import { Helmet } from 'react-helmet';
import { Grid, GridContainer } from '@trussworks/react-uswds';

export default function RecipientSpotlightDashboard() {
  return (
    <>
      <Helmet>
        <title>Regional Dashboard - Recipient spotlight</title>
      </Helmet>
      <GridContainer className="margin-0 padding-0">
        <Grid row gap={2} className="flex-align-stretch margin-bottom-3">
          <Grid desktop={{ col: 12 }} tabletLg={{ col: 12 }}>
            <div className="padding-3 bg-base-lightest radius-md">
              <p className="text-bold margin-top-0">Recipient spotlight dashboard</p>
              <p className="margin-bottom-0">Content coming soon...</p>
            </div>
          </Grid>
        </Grid>
      </GridContainer>
    </>
  );
}
