import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import QAOverview from '../../widgets/QualityAssuranceDashboardOverview';

export default function QADashboard() {
  const [error] = useState(null);

  return (
    <>
      <Helmet>
        <title>Quality Assurance Dashboard</title>
      </Helmet>
      <div className="ttahub-dashboard">
        <h1 className="landing margin-top-0 margin-bottom-3">
          Quality assurance dashboard
        </h1>
        <Grid row>
          {error && (
          <Alert className="margin-bottom-2" type="error" role="alert">
            {error}
          </Alert>
          )}
        </Grid>
        <QAOverview
          data={{
            recipientsWithNoTTA: { pct: '2.52%', filterApplicable: true },
            recipientsWithOhsStandardFeiGoals: { pct: '73.25%', filterApplicable: false },
            recipientsWithOhsStandardClass: { pct: '14.26%', filterApplicable: false },
          }}
          loading={false}
          fields={[
            'Recipients with no TTA',
            'Recipients with OHS standard FEI goal',
            'Recipients with OHS standard CLASS goal',
          ]}
        />
      </div>
    </>
  );
}
