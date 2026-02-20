import React, {
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Redirect } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';
import { Helmet } from 'react-helmet';
import { unlockReport } from '../../fetchers/activityReports';
import Modal from '../../components/Modal';
import Container from '../../components/Container';
import ApprovedReportV1 from '../../components/ReportView/ApprovedReportV1';
import ApprovedReportV2 from '../../components/ReportView/ApprovedReportV2';
import SubmittedReport from '../../components/ReportView/SubmittedReport';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import useReadOnlyReportFetch from '../../hooks/useReadOnlyReportFetch';
import './index.scss';

export default function ApprovedActivityReport({ match, user }) {
  const report = useReadOnlyReportFetch(match, user);
  const [justUnlocked, updatedJustUnlocked] = useState(false);
  const modalRef = useRef();

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
      3: <SubmittedReport data={report} />,
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

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = formatInTimeZone(new Date(), timezone, "MM/dd/yyyy 'at' h:mm a zzz");
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
