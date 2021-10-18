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
  availableApprovers,
  onFormSubmit,
  formData,
  onResetToDraft,
  children,
  error,
  onSaveForm,
  pages,
}) => {
  const {
    additionalNotes,
    id,
    displayId,
    calculatedStatus,
    approvers,
  } = formData;
  const draft = calculatedStatus === REPORT_STATUSES.DRAFT;
  const submitted = calculatedStatus === REPORT_STATUSES.SUBMITTED;
  const needsAction = calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;
  const approved = calculatedStatus === REPORT_STATUSES.APPROVED;
  const [approverStatusList, updateApproverStatusList] = useState([]);

  useEffect(() => {
    const updatedApprovers = approvers ? approvers.filter((a) => a.User) : [];
    if (updatedApprovers) {
      updateApproverStatusList(updatedApprovers);
    }
  }, [approvers, formData]);

  const resetToDraft = async () => {
    await onResetToDraft();
  };

  const getNeedsActionApprovingMangers = () => {
    const needActionApprovers = approvers.filter((a) => a.status === REPORT_STATUSES.NEEDS_ACTION);
    if (needActionApprovers && needActionApprovers.length > 0) {
      return needActionApprovers.map((a) => a.User.fullName).join(', ');
    }
    return '';
  };

  const totalApprovers = approvers ? approvers.length : 0;
  const pendingApprovals = approvers ? approvers.filter((a) => a.status === null || a.status === 'needs_action').length : 0;

  const renderTopAlert = () => (
    <>
      {needsAction && (
        <Alert type="error" noIcon slim className="margin-bottom-1 no-print">
          <span className="text-bold">
            The following approving manager(s) have requested changes to this activity report:
            {' '}
            {getNeedsActionApprovingMangers()}
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
          This report is no longer editable while it is waiting for manager approval&#40;s&#41;
          <strong>{` (${pendingApprovals} of ${totalApprovers} reviews pending)`}</strong>
          .
          <br />
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
              availableApprovers={availableApprovers}
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
              onSubmit={onFormSubmit}
              incompletePages={incompletePages}
              approverStatusList={approverStatusList}
            />
          )}
        {approved
          && (
            <Approved
              additionalNotes={additionalNotes}
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
  availableApprovers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
    calculatedStatus: PropTypes.string,
    id: PropTypes.number,
    displayId: PropTypes.string,
    approvers: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string,
      }),
    ),
  }).isRequired,
};

Submitter.defaultProps = {
  error: '',
};

export default Submitter;
