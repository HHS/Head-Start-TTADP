import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import QAOverview from '../../widgets/QualityAssuranceDashboardOverview';

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
      </div>
    </>
  );
}
