import React from 'react'
import { Helmet } from 'react-helmet'
import { Grid, GridContainer } from '@trussworks/react-uswds'

export default function AllReports() {
  return (
    <>
      <Helmet>
        <title>Regional Dashboard - All Reports</title>
      </Helmet>
      <GridContainer className="margin-0 padding-0">
        <Grid row gap={2}>
          <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }} />
          <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }} />
        </Grid>
        <Grid row />
        <Grid row />
      </GridContainer>
    </>
  )
}
