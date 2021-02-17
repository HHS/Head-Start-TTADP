import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';

import Submitter from './Submitter';
import Approver from './Approver';
import './index.css';

const ReviewSubmit = ({
  allComplete,
  onSubmit,
  onReview,
  reviewItems,
  approvers,
  approvingManager,
  formData,
  onResetToDraft,
}) => {
  const { handleSubmit, register, formState } = useFormContext();
  const { additionalNotes, status } = formData;
  const { isValid } = formState;
  const valid = allComplete && isValid;

  const [reviewed, updateReviewed] = useState(false);
  const [error, updateError] = useState();

  const onFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      updateError();
    } catch (e) {
      updateError('Unable to submit report');
    }
  };

  const onFormReview = async (data) => {
    try {
      await onReview(data);
      updateReviewed(true);
      updateError();
    } catch (e) {
      updateReviewed(false);
      updateError('Unable to review report');
    }
  };

  const onReset = async () => {
    try {
      await onResetToDraft();
      updateError();
    } catch (e) {
      updateError('Unable to reset Activity Report to draft');
    }
  };

  return (
    <>
      <Helmet>
        <title>Review and submit</title>
      </Helmet>
      {!approvingManager
        && (
        <Submitter
          status={status}
          allComplete={allComplete}
          register={register}
          approvers={approvers}
          valid={valid}
          handleSubmit={handleSubmit}
          onFormSubmit={onFormSubmit}
          onResetToDraft={onReset}
          formData={formData}
          error={error}
        >
          <Accordion bordered={false} items={reviewItems} />
        </Submitter>
        )}
      {approvingManager
        && (
        <Approver
          status={status}
          reviewed={reviewed}
          additionalNotes={additionalNotes}
          register={register}
          valid={valid}
          error={error}
          handleSubmit={handleSubmit}
          onFormReview={onFormReview}
          formData={formData}
        >
          <Accordion bordered={false} items={reviewItems} />
        </Approver>
        )}
    </>
  );
};

ReviewSubmit.propTypes = {
  approvers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  allComplete: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  onResetToDraft: PropTypes.func.isRequired,
  approvingManager: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    }),
  ).isRequired,
};

export default ReviewSubmit;
