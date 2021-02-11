import React from 'react';
import PropTypes from 'prop-types';

import DraftReview from './Draft';
import NeedsAction from './NeedsAction';
import Approved from './Approved';

import { REPORT_STATUSES } from '../../../../../Constants';

const Submitter = ({
  submitted,
  allComplete,
  register,
  approvers,
  valid,
  handleSubmit,
  onFormSubmit,
  formData,
}) => {
  const {
    approvingManager,
    managerNotes,
    additionalNotes,
    status,
  } = formData;
  const notReviewed = status === REPORT_STATUSES.DRAFT || status === REPORT_STATUSES.SUBMITTED;
  const needsAction = status === REPORT_STATUSES.NEEDS_ACTION;
  const approved = status === REPORT_STATUSES.APPROVED;

  return (
    <>
      {notReviewed
      && (
      <DraftReview
        submitted={submitted}
        allComplete={allComplete}
        register={register}
        approvers={approvers}
        valid={valid}
        handleSubmit={handleSubmit}
        onFormSubmit={onFormSubmit}
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
    </>
  );
};

Submitter.propTypes = {
  submitted: PropTypes.bool.isRequired,
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

export default Submitter;
