import React, {
  useEffect, useState, useRef,
} from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Redirect, useHistory } from 'react-router-dom';
import moment from 'moment-timezone';
import { Helmet } from 'react-helmet';
import { getReport, unlockReport } from '../../fetchers/activityReports';
import Modal from '../../components/Modal';
import Container from '../../components/Container';
import {
  LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_EDITABLE_KEY,
} from '../../Constants';
import './index.scss';
import ApprovedReportV1 from './components/ApprovedReportV1';
import ApprovedReportV2 from './components/ApprovedReportV2';
import ApprovedReportV3 from './components/ApprovedReportV3';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';

export default function ApprovedActivityReport({ match, user }) {
  const history = useHistory();
  const [justUnlocked, updatedJustUnlocked] = useState(false);

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

  const modalRef = useRef();

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
    id: reportId,
    displayId,
    version,
  } = report;

  const ReportComponent = () => {
    // Map of report versions to their respective components
    const reportsMap = {
      1: <ApprovedReportV1 data={report} />,
      2: <ApprovedReportV2 data={report} />,
      3: <ApprovedReportV3 data={report} />,
      loading: <Container className="ttahub-activity-report-view margin-top-2 minh-tablet">Loading...</Container>,
    };

    // If the version is not found, default to ApprovedReportV1
    return reportsMap[version] || <ApprovedReportV1 data={report} />;
  };

  /* istanbul ignore next: hard to test modals */
  const onUnlock = async () => {
    await unlockReport(reportId);
    modalRef.current.toggleModal(false);
    updatedJustUnlocked(true);
  };

  const UnlockModal = () => (
    <Modal
      modalRef={modalRef}
      onOk={/* istanbul ignore next: hard to test modals */ () => onUnlock()}
      modalId="UnlockReportModal"
      title="Unlock Activity Report"
      okButtonText="Unlock"
      okButtonAriaLabel="Unlock approved report will redirect to activity report page."
    >
      <>
        Are you sure you want to unlock this activity report?
        <br />
        <br />
        The report status will be set to
        {' '}
        <b>NEEDS ACTION</b>
        {' '}
        and
        {' '}
        <br />
        must be re-submitted for approval.
      </>
    </Modal>
  );

  const timezone = moment.tz.guess();
  const time = moment().tz(timezone).format('MM/DD/YYYY [at] h:mm a z');
  const message = {
    time,
    reportId,
    displayId,
    status: 'unlocked',
  };

  return (
    <>

      {justUnlocked && /* istanbul ignore next: can't test because of modals */ <Redirect to={{ pathname: '/activity-reports', state: { message } }} />}
      <Helmet>
        <title>
          TTA Activity Report
          {' '}
          {displayId}
        </title>
      </Helmet>
      <ApprovedReportSpecialButtons
        modalRef={modalRef}
        UnlockModal={UnlockModal}
        user={user}
        showUnlockReports
      />
      <ReportComponent />
    </>
  );
}
ApprovedActivityReport.propTypes = {
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
