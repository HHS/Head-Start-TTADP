import React from 'react';
import { Helmet } from 'react-helmet';

export default function QADashboard() {
  return (
    <>
      <Helmet>
        <title>Quality Assurance Dashboard</title>
      </Helmet>
      <div className="ttahub-dashboard">
        <h1 className="landing margin-top-0 margin-bottom-3">
          Quality assurance dashboard
        </h1>
      </div>
    </>
  );
}
