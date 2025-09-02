import React from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import SubmittedReport from '../../components/ReportView/SubmittedReport';
import useReadOnlyReportFetch from '../../hooks/useReadOnlyReportFetch';

export default function SubmittedActivityReport({ match, user }) {
  const report = useReadOnlyReportFetch(match, user);

  const {
    displayId,
  } = report;

  return (
    <>
      <Helmet>
        <title>
          TTA Activity Report
          {' '}
          {displayId}
        </title>
      </Helmet>
      <ApprovedReportSpecialButtons
        user={user}
        showUnlockReports={false}
      />
      <SubmittedReport data={report} />
    </>
  );
}

SubmittedActivityReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    permissions: PropTypes.arrayOf(PropTypes.shape({
      regionId: PropTypes.number.isRequired,
      scopeId: PropTypes.number.isRequired,
    })),
  }).isRequired,
};
