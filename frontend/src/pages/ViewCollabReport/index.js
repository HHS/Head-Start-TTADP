import { Alert, ModalToggleButton } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common';
import moment from 'moment-timezone';
import PropTypes from 'prop-types';
import React, { useCallback, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Redirect } from 'react-router';
import ReactRouterPropTypes from 'react-router-prop-types';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import Modal from '../../components/Modal';
import SubmittedCollabReport from '../../components/ReportView/SubmittedCollabReport';
import { getReport, resetReportToDraft, unlockReport } from '../../fetchers/collaborationReports';
import useFetch from '../../hooks/useFetch';
import isAdmin from '../../permissions';

export default function ViewCollabReport({ match, user }) {
  const { collabReportId } = match.params;
  const displayId = collabReportId;
  const [justUnlocked, updatedJustUnlocked] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const modalRef = useRef();
  const resetModalRef = useRef();

  const {
    data: report,
    setData: setReport,
    error,
    statusCode,
  } = useFetch(
    null,
    useCallback(() => getReport(collabReportId), [collabReportId]),
    [collabReportId]
  );

  /* istanbul ignore next: hard to test modals */
  const onUnlock = async () => {
    await unlockReport(collabReportId);
    modalRef.current.toggleModal(false);
    updatedJustUnlocked(true);
  };

  const UnlockModal = () => (
    <Modal
      modalRef={modalRef}
      onOk={/* istanbul ignore next: hard to test modals */ () => onUnlock()}
      modalId="UnlockReportModal"
      title="Unlock Collaboration Report"
      okButtonText="Unlock"
      okButtonAriaLabel="Unlock collaboration report will redirect to collaboration report page."
    >
      <>
        Are you sure you want to unlock this collaboration report?
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
      setReport(await resetReportToDraft(collabReportId));
      setResetMessage({ type: 'success', text: 'This report has been reset to draft.' });
    } catch (e) {
      setResetMessage({ type: 'error', text: 'Unable to reset this report to draft.' });
    }
  };

  if (error) {
    return <Redirect to={`/something-went-wrong/${statusCode}`} />;
  }

  if (!report) {
    return null;
  }

  const timezone = moment.tz.guess();
  const time = moment().tz(timezone).format('MM/DD/YYYY [at] h:mm a z');
  const message = {
    time,
    reportId: collabReportId,
    displayId,
    status: 'unlocked',
  };

  return (
    <>
      {justUnlocked && (
        /* istanbul ignore next: can't test because of modals */ <Redirect
          to={{ pathname: '/collaboration-reports', state: { message } }}
        />
      )}
      <Helmet>
        <title>TTA Collaboration Report {displayId}</title>
      </Helmet>
      <ApprovedReportSpecialButtons
        showUnlockReports={report.calculatedStatus === REPORT_STATUSES.APPROVED}
        modalRef={modalRef}
        UnlockModal={UnlockModal}
        user={user}
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
              title="Reset Collaboration Report to draft"
              okButtonText="Reset to draft"
              okButtonAriaLabel="Reset collaboration report to draft"
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
      <SubmittedCollabReport report={report} />
    </>
  );
}

ViewCollabReport.propTypes = {
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
