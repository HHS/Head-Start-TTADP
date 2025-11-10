import React, { useCallback } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Redirect } from 'react-router';
import { Helmet } from 'react-helmet';
import { getReport } from '../../fetchers/collaborationReports';
import SubmittedCollabReport from '../../components/ReportView/SubmittedCollabReport';
import useFetch from '../../hooks/useFetch';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import { NOOP } from '../../Constants';

export default function ViewCollabReport({ match }) {
  const { collabReportId } = match.params;
  const displayId = collabReportId;

  const { data: report, error, statusCode } = useFetch(
    null,
    useCallback(() => getReport(collabReportId), [collabReportId]),
    [collabReportId],
  );

  if (error) {
    return <Redirect to={`/something-went-wrong/${statusCode}`} />;
  }

  if (!report) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>
          TTA Collaboration Report
          {' '}
          {displayId}
        </title>
      </Helmet>
      <ApprovedReportSpecialButtons UnlockModal={NOOP} />
      <SubmittedCollabReport report={report} />
    </>
  );
}

ViewCollabReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
