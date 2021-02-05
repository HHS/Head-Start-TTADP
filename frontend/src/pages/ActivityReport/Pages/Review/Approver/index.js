import React from 'react';
import PropTypes from 'prop-types';

import Review from './Review';
import Approved from './Approved';
import { REPORT_STATUSES } from '../../../../../Constants';

const Approver = ({
  status,
  register,
  handleSubmit,
  onFormReview,
  reviewed,
  formData,
  valid,
}) => {
  const review = status === REPORT_STATUSES.SUBMITTED || status === REPORT_STATUSES.NEEDS_ACTION;
  const approved = status === REPORT_STATUSES.APPROVED;
  const { managerNotes, additionalNotes } = formData;

  return (
    <>
      {review
      && (
      <Review
        valid={valid}
        reviewed={reviewed}
        additionalNotes={additionalNotes}
        register={register}
        handleSubmit={handleSubmit}
        onFormReview={onFormReview}
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

Approver.propTypes = {
  status: PropTypes.string.isRequired,
  register: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onFormReview: PropTypes.func.isRequired,
  reviewed: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    approvingManager: PropTypes.shape({
      name: PropTypes.string,
    }),
    managerNotes: PropTypes.string,
    additionalNotes: PropTypes.string,
  }).isRequired,
};

export default Approver;
