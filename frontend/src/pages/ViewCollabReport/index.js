import React, { useCallback, useRef, useState } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Redirect } from 'react-router';
import { Helmet } from 'react-helmet';
import moment from 'moment-timezone';
import PropTypes from 'prop-types';
import { getReport, unlockReport } from '../../fetchers/collaborationReports';
import SubmittedCollabReport from '../../components/ReportView/SubmittedCollabReport';
import Modal from '../../components/Modal';
import useFetch from '../../hooks/useFetch';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';

export default function ViewCollabReport({ match, user }) {
  const { collabReportId } = match.params;
  const displayId = collabReportId;
  const [justUnlocked, updatedJustUnlocked] = useState(false);
  const modalRef = useRef();

  const { data: report, error, statusCode } = useFetch(
    null,
    useCallback(() => getReport(collabReportId), [collabReportId]),
    [collabReportId],
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
    collabReportId,
    displayId,
    status: 'unlocked',
  };

  return (
    <>
      {justUnlocked && /* istanbul ignore next: can't test because of modals */ <Redirect to={{ pathname: '/collaboration-reports', state: { message } }} />}
      <Helmet>
        <title>
          TTA Collaboration Report
          {' '}
          {displayId}
        </title>
      </Helmet>
      <ApprovedReportSpecialButtons
        showUnlockReports
        modalRef={modalRef}
        UnlockModal={UnlockModal}
        user={user}
      />
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
    permissions: PropTypes.arrayOf(PropTypes.shape({
      regionId: PropTypes.number.isRequired,
      scopeId: PropTypes.number.isRequired,
    })),
  }).isRequired,
};
