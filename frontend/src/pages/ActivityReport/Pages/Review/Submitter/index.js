import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';

import Container from '../../../../../components/Container';
import { REPORT_STATUSES } from '../../../../../Constants';
import DraftReview from './Draft';
import NeedsAction from './NeedsAction';
import Approved from './Approved';
import Submitted from './Submitted';

const Submitter = ({
  allComplete,
  register,
  approvers,
  valid,
  handleSubmit,
  onFormSubmit,
  formData,
  onResetToDraft,
  children,
  error,
}) => {
  const {
    approvingManager,
    managerNotes,
    additionalNotes,
    status,
  } = formData;
  const draft = status === REPORT_STATUSES.DRAFT;
  const submitted = status === REPORT_STATUSES.SUBMITTED;
  const needsAction = status === REPORT_STATUSES.NEEDS_ACTION;
  const approved = status === REPORT_STATUSES.APPROVED;

  const resetToDraft = async () => {
    await onResetToDraft();
  };

  const renderTopAlert = () => (
    <>
      {needsAction && (
        <Alert type="error" noIcon slim className="margin-bottom-1">
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
        <Alert type="info" noIcon slim className="margin-bottom-1">
          This report has been approved and is no longer editable
        </Alert>
      )}
      {submitted && (
        <Alert type="info" noIcon slim className="margin-bottom-1">
          <b>Report is not editable</b>
          <br />
          This report is no longer editable while it is waiting for manager approval.
          If you wish to update this report click &quot;Reset to Draft&quot; below to
          move the report back to draft mode.
        </Alert>
      )}
    </>
  );

  return (
    <>
      {renderTopAlert()}
      {children}
      <Container skipTopPadding className="margin-top-2 padding-top-2">
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
          allComplete={allComplete}
          register={register}
          approvers={approvers}
          valid={valid}
          handleSubmit={handleSubmit}
          onFormSubmit={onFormSubmit}
        />
        )}
        {submitted
        && (
          <Submitted
            additionalNotes={additionalNotes}
            approvingManager={approvingManager}
            resetToDraft={resetToDraft}
          />
        )}
        {needsAction
        && (
        <NeedsAction
          additionalNotes={additionalNotes}
          managerNotes={managerNotes}
          onSubmit={onFormSubmit}
          approvingManager={approvingManager}
          valid={valid}
        />
        )}
        {approved
        && (
        <Approved
          additionalNotes={additionalNotes}
          managerNotes={managerNotes}
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
  allComplete: PropTypes.bool.isRequired,
  register: PropTypes.func.isRequired,
  approvers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  valid: PropTypes.bool.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  formData: PropTypes.shape({
    approvingManager: PropTypes.shape({
      name: PropTypes.string,
    }),
    managerNotes: PropTypes.string,
    additionalNotes: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
};

Submitter.defaultProps = {
  error: '',
};

export default Submitter;
