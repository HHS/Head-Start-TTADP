import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './ReportLink.scss';

export default function ReportLink({
  reportId, reportName, to,
}) {
  return (
    <div className="usa-prose">
      <Link className="no-print ttahub-back-link text-ttahub-blue margin-bottom-2 margin-top-2 display-inline-block" to={to}>{reportId}</Link>
      {`: ${reportName}`}
    </div>
  );
}

ReportLink.propTypes = {
  reportId: PropTypes.string.isRequired,
  reportName: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
};
