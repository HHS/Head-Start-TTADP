import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';

import Container from '../../../../../components/Container';
import { REPORT_STATUSES } from '../../../../../Constants';
import DraftReview from './Draft';
import NeedsAction from './NeedsAction';
import Approved from './Approved';
import Submitted from './Submitted';

const Submitter = ({
  approvers,
  onFormSubmit,
  formData,
  onResetToDraft,
  children,
  error,
  onSaveForm,
  pages,
}) => {
  const {
    approvingManager,
    managerNotes,
    additionalNotes,
    status,
    id,
    displayId,
  } = formData;
  const draft = status === REPORT_STATUSES.DRAFT;
  const submitted = status === REPORT_STATUSES.SUBMITTED;
  const needsAction = status === REPORT_STATUSES.NEEDS_ACTION;
  const approved = status === REPORT_STATUSES.APPROVED;
  const [approverStatusList, updateApproverStatusList] = useState([]);

  useEffect(() => {
    if (formData && approvingManager && status) {
      updateApproverStatusList([{ approver: approvingManager.fullName, status }]);
    }
  }, [formData, approvingManager, status]);

  const resetToDraft = async () => {
    await onResetToDraft();
  };

  const renderTopAlert = () => (
    <>
      {needsAction && (
        <Alert type="error" noIcon slim className="margin-bottom-1 no-print">
          <span className="text-bold">
            { approvingManager.name }
            {' '}
            has requested updates to this activity report.
          </span>
          <br />
          Please review the manager notes below and re-submit for approval.
        </Alert>
      )}
      {approved && (
        <Alert type="info" noIcon slim className="margin-bottom-1 no-print">
          This report has been approved and is no longer editable
        </Alert>
      )}
      {submitted && (
        <Alert type="info" noIcon slim className="margin-bottom-1 no-print">
          <b>Report is not editable</b>
          <br />
          This report is no longer editable while it is waiting for manager approval.
          If you wish to update this report click &quot;Reset to Draft&quot; below to
          move the report back to draft mode.
        </Alert>
      )}
    </>
  );

  const filtered = pages.filter((p) => !(p.state === 'Complete' || p.review));
  const incompletePages = filtered.map((f) => f.label);

  return (
    <>
      {renderTopAlert()}
      {children}
      <Container skipTopPadding className="margin-top-2 padding-top-2 padding-bottom-1" skipBottomPadding>
        {error && (
        <Alert noIcon className="margin-y-4" type="error">
          <b>Error</b>
          <br />
          {error}
        </Alert>
        )}
        {draft
        && (
        <DraftReview
          onSaveForm={onSaveForm}
          incompletePages={incompletePages}
          approvers={approvers}
          onFormSubmit={onFormSubmit}
          reportId={id}
          displayId={displayId}
          approverStatusList={approverStatusList}
        />
        )}
        {submitted
        && (
          <Submitted
            additionalNotes={additionalNotes}
            approvingManager={approvingManager}
            resetToDraft={resetToDraft}
            reportId={id}
            displayId={displayId}
            approverStatusList={approverStatusList}
          />
        )}
        {needsAction
        && (
        <NeedsAction
          additionalNotes={additionalNotes}
          managerNotes={managerNotes}
          onSubmit={onFormSubmit}
          approvingManager={approvingManager}
          incompletePages={incompletePages}
          approverStatusList={approverStatusList}
        />
        )}
        {approved
        && (
        <Approved
          additionalNotes={additionalNotes}
          managerNotes={managerNotes}
          approverStatusList={approverStatusList}
        />
        )}
      </Container>
    </>
  );
};

Submitter.propTypes = {
  onResetToDraft: PropTypes.func.isRequired,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
  onSaveForm: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
  approvers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  formData: PropTypes.shape({
    approvingManager: PropTypes.shape({
      name: PropTypes.string,
      fullName: PropTypes.string,
    }),
    managerNotes: PropTypes.string,
    additionalNotes: PropTypes.string,
    status: PropTypes.string,
    id: PropTypes.number,
    displayId: PropTypes.string,
  }).isRequired,
};

Submitter.defaultProps = {
  error: '',
};

export default Submitter;
