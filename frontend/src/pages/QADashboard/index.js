import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Grid,
} from '@trussworks/react-uswds';
import QAOverview from '../../widgets/QualityAssuranceDashboardOverview';
import DeliveryMethod from '../../widgets/DeliveryMethodGraph';

const DATA = [
  {
    name: 'Recipient Rec TTA', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [1, 2, 3, 4, 5, 6], month: [false, false, false, false, false, false],
  },
  {
    name: 'Hours of Training', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [7, 8, 9, 0, 0, 0], month: [false, false, false, false, false, false],
  },
  {
    name: 'Hours of Technical Assistance', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [0, 0, 0, 10, 11.2348732847, 12], month: [false, false, false, false, false, false],
  },
  {
    name: 'Hours of Both', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [0, 13, 0, 14, 0, 0], month: [false, false, false, false, false, false],
  },
];

export default function QADashboard() {
  const [isLoading] = useState(false);

  return (
    <>
      <Helmet>
        <title>Quality Assurance Dashboard</title>
      </Helmet>
      <div className="ttahub-dashboard">
        <h1 className="landing margin-top-0 margin-bottom-3">
          Quality assurance dashboard
        </h1>
        <QAOverview
          data={{
            recipientsWithNoTTA: { pct: '2.52%', filterApplicable: true },
            recipientsWithOhsStandardFeiGoals: { pct: '73.25%', filterApplicable: false },
            recipientsWithOhsStandardClass: { pct: '14.26%', filterApplicable: false },
          }}
          loading={isLoading}
        />

        <div>
          <Grid row>
            <DeliveryMethod
              data={DATA}
              loading={false}
            />
          </Grid>
        </div>
      </div>
    </>
  );
}
