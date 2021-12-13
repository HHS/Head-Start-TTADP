import React from 'react';
import { Link } from 'react-router-dom';

import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';

function NewReport() {
  return (
    <Link
      to="/activity-reports/new/activity-summary"
      referrerPolicy="same-origin"
      className="usa-button smart-hub--new-report-btn margin-bottom-1"
      variant="unstyled"
    >
      <span className="smart-hub--plus">+</span>
      <span className="smart-hub--new-report">New Activity Report</span>
    </Link>
  );
}

export default NewReport;
