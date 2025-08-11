import React, {
  useEffect, useState,
} from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { getReport } from '../../fetchers/activityReports';
import {
  LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_EDITABLE_KEY,
} from '../../Constants';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import SubmittedReport from '../../components/ReportView/SubmittedReport';

export default function SubmittedActivityReport({ match, user }) {
  const history = useHistory();

  const [report, setReport] = useState({
    version: 'loading',
    reportId: 0,
    displayId: '',
    recipientType: 'Recipient',
    activityRecipients: [],
    targetPopulations: [],
    approvers: [],
    activityReportCollaborators: [],
    participants: [],
    numberOfParticipants: 0,
    reason: [],
    author: { fullName: '' },
    createdAt: '',
    approvedAt: '',
    recipientNextSteps: [],
    specialistNextSteps: [],
    goalsAndObjectives: [],
    objectivesWithoutGoals: [],
    context: '',
    additionalNotes: '',
    files: [],
    ECLKCResourcesUsed: [],
    nonECLKCResourcesUsed: [],
    topics: [],
    requester: '',
    virtualDeliveryType: '',
    duration: 0,
    endDate: '',
    startDate: '',
    creatorNotes: '',
    ttaType: ['Training'],
    language: [],
  });

  // cleanup local storage if the report has been submitted or approved
  useEffect(() => {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_DATA_KEY(report.id));
      window.localStorage.removeItem(LOCAL_STORAGE_ADDITIONAL_DATA_KEY(report.id));
      window.localStorage.removeItem(LOCAL_STORAGE_EDITABLE_KEY(report.id));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Local storage may not be available: ', e);
    }
  },
  [report.id]);

  useEffect(() => {
    if (!parseInt(match.params.activityReportId, 10)) {
      history.push('/something-went-wrong/404');
      return;
    }

    async function fetchReport() {
      try {
        const data = await getReport(match.params.activityReportId);
        // review and submit table
        setReport(data);
      } catch (err) {
        history.push(`/something-went-wrong/${err.status}`);
      }
    }

    fetchReport();
  }, [match.params.activityReportId, user, history]);

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
