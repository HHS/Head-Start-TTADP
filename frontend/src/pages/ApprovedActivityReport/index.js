import { Alert, ModalToggleButton } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common';
import moment from 'moment-timezone';
import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Redirect } from 'react-router-dom';
import ReactRouterPropTypes from 'react-router-prop-types';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import Container from '../../components/Container';
import Modal from '../../components/Modal';
import ApprovedReportV1 from '../../components/ReportView/ApprovedReportV1';
import ApprovedReportV2 from '../../components/ReportView/ApprovedReportV2';
import SubmittedReport from '../../components/ReportView/SubmittedReport';
import { resetToDraft, unlockReport } from '../../fetchers/activityReports';
import useReadOnlyReportFetch from '../../hooks/useReadOnlyReportFetch';
import isAdmin from '../../permissions';
import './index.scss';

export default function ApprovedActivityReport({ match, user }) {
  const fetchedReport = useReadOnlyReportFetch(match, user);
  const [resetReport, setResetReport] = useState(null);
  const [resetMessage, setResetMessage] = useState(null);
  const [justUnlocked, updatedJustUnlocked] = useState(false);
  const modalRef = useRef();
  const resetModalRef = useRef();
  const report = resetReport || fetchedReport;

  const { id: reportId, displayId, version } = report;

  const ReportComponent = () => {
    // Map of report versions to their respective components
    const reportsMap = {
      1: <ApprovedReportV1 data={report} />,
      2: <ApprovedReportV2 data={report} />,
      3: <SubmittedReport data={report} />,
      loading: (
        <Container className="ttahub-activity-report-view margin-top-2 minh-tablet">
          Loading...
        </Container>
      ),
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
        The report status will be set to <b>NEEDS ACTION</b> and <br />
        must be re-submitted for approval.
      </>
    </Modal>
  );

  const onReset = async () => {
    resetModalRef.current.toggleModal(false);
    try {
      setResetReport(await resetToDraft(reportId));
      setResetMessage({ type: 'success', text: 'This report has been reset to draft.' });
    } catch (e) {
      setResetMessage({ type: 'error', text: 'Unable to reset this report to draft.' });
    }
  };

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
      {justUnlocked && (
        /* istanbul ignore next: can't test because of modals */ <Redirect
          to={{ pathname: '/activity-reports', state: { message } }}
        />
      )}
      <Helmet>
        <title>TTA Activity Report {displayId}</title>
      </Helmet>
      <ApprovedReportSpecialButtons
        modalRef={modalRef}
        UnlockModal={UnlockModal}
        user={user}
        showUnlockReports={report.calculatedStatus === REPORT_STATUSES.APPROVED}
      />
      {user &&
        isAdmin(user) &&
        [REPORT_STATUSES.SUBMITTED, REPORT_STATUSES.NEEDS_ACTION].includes(
          report.calculatedStatus
        ) && (
          <>
            <ModalToggleButton
              type="button"
              className="usa-button usa-button--outline no-print margin-top-1"
              modalRef={resetModalRef}
              opener
            >
              Reset to draft
            </ModalToggleButton>
            <Modal
              modalRef={resetModalRef}
              onOk={onReset}
              modalId="ResetToDraftModal"
              title="Reset Activity Report to draft"
              okButtonText="Reset to draft"
              okButtonAriaLabel="Reset activity report to draft"
            >
              The creator will be able to edit and resubmit the report. Approvers who are the
              creator or a collaborator will be removed; other approvers keep their status.
            </Modal>
          </>
        )}
      {resetMessage && (
        <Alert type={resetMessage.type} headingLevel="h2" slim className="margin-top-2 no-print">
          {resetMessage.text}
        </Alert>
      )}
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
    permissions: PropTypes.arrayOf(
      PropTypes.shape({
        regionId: PropTypes.number.isRequired,
        scopeId: PropTypes.number.isRequired,
      })
    ),
  }).isRequired,
};
